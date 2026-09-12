import { addDays, addMonths, addWeeks, addYears, format, parseISO } from "date-fns";
import { Resend } from "resend";
import { createServiceClient } from "@/lib/supabase/admin";
import { asCurrency, formatMoney, money } from "@/lib/money";
import { todayMexico } from "@/lib/credit-cycle";
import { projectCashflow, suggestPayToAvoidInterest } from "@/lib/cashflow/engine";

const LEAD_DAYS = 3;
const CASHFLOW_HORIZON = 45;

function hubUrl(path = "/app/quincena") {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  return base ? `${base}${path}` : path;
}

function withHubLink(body: string, path = "/app/quincena") {
  return `${body} Abre tu quincena: ${hubUrl(path)}`;
}

type ReminderInsert = {
  user_id: string;
  project_id: string;
  event_type:
    | "statement_close"
    | "payment_due"
    | "subscription_charge"
    | "cashflow_shortfall";
  channel: "in_app" | "email";
  title: string;
  body: string;
  due_on: string;
  related_account_id?: string | null;
  related_subscription_id?: string | null;
  related_statement_id?: string | null;
  dedupe_key: string;
};

function withinLead(dueOn: string, today: string): boolean {
  const due = parseISO(dueOn);
  const start = parseISO(today);
  const end = addDays(start, LEAD_DAYS);
  return due >= start && due <= end;
}

function advanceBilling(
  date: string,
  frequency: "weekly" | "monthly" | "yearly",
): string {
  const d = parseISO(`${date}T12:00:00`);
  const next =
    frequency === "weekly"
      ? addWeeks(d, 1)
      : frequency === "yearly"
        ? addYears(d, 1)
        : addMonths(d, 1);
  return format(next, "yyyy-MM-dd");
}

function dedupeKey(parts: {
  userId: string;
  event: string;
  channel: string;
  dueOn: string;
  accountId?: string | null;
  subscriptionId?: string | null;
  statementId?: string | null;
}) {
  return [
    parts.userId,
    parts.event,
    parts.channel,
    parts.dueOn,
    parts.accountId ?? "-",
    parts.subscriptionId ?? "-",
    parts.statementId ?? "-",
  ].join("|");
}

export async function materializeAndSendReminders() {
  const admin = createServiceClient();
  const today = todayMexico();
  const inserts: ReminderInsert[] = [];

  // Advance past-due active subscriptions
  const { data: allSubs } = await admin
    .from("subscriptions")
    .select("id, next_billing_on, frequency, is_active")
    .eq("is_active", true)
    .lt("next_billing_on", today);

  for (const sub of allSubs ?? []) {
    let next = sub.next_billing_on;
    let guard = 0;
    while (next < today && guard < 120) {
      next = advanceBilling(next, sub.frequency);
      guard += 1;
    }
    if (next !== sub.next_billing_on) {
      await admin
        .from("subscriptions")
        .update({
          next_billing_on: next,
          updated_at: new Date().toISOString(),
        })
        .eq("id", sub.id);
    }
  }

  const { data: periods } = await admin
    .from("statement_periods")
    .select("*, accounts(name, user_id)")
    .in("status", ["open", "closed"]);

  for (const period of periods ?? []) {
    const account = period.accounts as
      | { name: string; user_id: string }
      | null
      | undefined;
    if (!account) continue;

    if (period.status === "open" && withinLead(period.closes_on, today)) {
      for (const channel of ["in_app", "email"] as const) {
        inserts.push({
          user_id: account.user_id,
          project_id: period.project_id,
          event_type: "statement_close",
          channel,
          title: `Corte próximo: ${account.name}`,
          body: `El corte de ${account.name} es el ${period.closes_on}. Revisa tus cargos del periodo.`,
          due_on: period.closes_on,
          related_account_id: period.account_id,
          related_statement_id: period.id,
          dedupe_key: dedupeKey({
            userId: account.user_id,
            event: "statement_close",
            channel,
            dueOn: period.closes_on,
            accountId: period.account_id,
            statementId: period.id,
          }),
        });
      }
    }

    if (
      (period.status === "open" || period.status === "closed") &&
      withinLead(period.due_on, today)
    ) {
      const balance =
        period.closing_balance_cents ?? period.opening_balance_cents;
      for (const channel of ["in_app", "email"] as const) {
        inserts.push({
          user_id: account.user_id,
          project_id: period.project_id,
          event_type: "payment_due",
          channel,
          title: `Tu quincena · Pago de tarjeta: ${account.name}`,
          body: withHubLink(
            `Fecha límite ${period.due_on}. Saldo de referencia ${formatMoney(money(balance))}. Mínimo ${formatMoney(money(period.minimum_payment_cents))}.`,
          ),
          due_on: period.due_on,
          related_account_id: period.account_id,
          related_statement_id: period.id,
          dedupe_key: dedupeKey({
            userId: account.user_id,
            event: "payment_due",
            channel,
            dueOn: period.due_on,
            accountId: period.account_id,
            statementId: period.id,
          }),
        });
      }
    }
  }

  const { data: subs } = await admin
    .from("subscriptions")
    .select("*, accounts(name)")
    .eq("is_active", true);

  for (const sub of subs ?? []) {
    if (!withinLead(sub.next_billing_on, today)) continue;
    const accountName =
      sub.accounts && typeof sub.accounts === "object" && "name" in sub.accounts
        ? String((sub.accounts as { name: string }).name)
        : "tu cuenta";
    for (const channel of ["in_app", "email"] as const) {
      inserts.push({
        user_id: sub.user_id,
        project_id: sub.project_id,
        event_type: "subscription_charge",
        channel,
        title: `Cobro de ${sub.name}`,
        body: `${sub.name} (${sub.merchant}) se cobra el ${sub.next_billing_on} en ${accountName} por ${formatMoney(money(sub.amount_cents))}.`,
        due_on: sub.next_billing_on,
        related_account_id: sub.account_id,
        related_subscription_id: sub.id,
        dedupe_key: dedupeKey({
          userId: sub.user_id,
          event: "subscription_charge",
          channel,
          dueOn: sub.next_billing_on,
          accountId: sub.account_id,
          subscriptionId: sub.id,
        }),
      });
    }
  }

  // Cashflow shortfall per project
  const { data: allAccounts } = await admin
    .from("accounts")
    .select("*")
    .eq("is_archived", false);

  const accountsByProject = new Map<string, typeof allAccounts>();
  for (const a of allAccounts ?? []) {
    const list = accountsByProject.get(a.project_id) ?? [];
    list.push(a);
    accountsByProject.set(a.project_id, list);
  }

  for (const [projectId, projectAccounts] of accountsByProject) {
    if (!projectAccounts || projectAccounts.length === 0) continue;

    const [
      { data: profiles },
      { data: openPeriods },
      { data: closedPeriods },
      { data: projectSubs },
      { data: planned },
      { data: installments },
      { data: members },
    ] = await Promise.all([
      admin
        .from("credit_card_profiles")
        .select("*")
        .eq("project_id", projectId),
      admin
        .from("statement_periods")
        .select("*")
        .eq("project_id", projectId)
        .eq("status", "open"),
      admin
        .from("statement_periods")
        .select("*")
        .eq("project_id", projectId)
        .eq("status", "closed")
        .order("closes_on", { ascending: false }),
      admin
        .from("subscriptions")
        .select("*")
        .eq("project_id", projectId)
        .eq("is_active", true),
      admin
        .from("planned_inflows")
        .select("*")
        .eq("project_id", projectId)
        .eq("is_active", true),
      admin
        .from("installment_plans")
        .select("*")
        .eq("project_id", projectId)
        .eq("is_active", true),
      admin
        .from("project_members")
        .select("user_id, role")
        .eq("project_id", projectId)
        .in("role", ["owner", "member"]),
    ]);

    const liquid = projectAccounts.filter((a) => a.type !== "credit_card");
    const cards = projectAccounts.filter((a) => a.type === "credit_card");
    const profileBy = new Map((profiles ?? []).map((p) => [p.account_id, p]));
    const openBy = new Map((openPeriods ?? []).map((p) => [p.account_id, p]));
    const closedBy = new Map<
      string,
      {
        account_id: string;
        due_on: string;
        closing_balance_cents: number | null;
        minimum_payment_cents: number;
      }
    >();
    for (const p of closedPeriods ?? []) {
      if (!closedBy.has(p.account_id)) closedBy.set(p.account_id, p);
    }

    const creditObligations = cards.map((card) => {
      const open = openBy.get(card.id);
      const closed = closedBy.get(card.id);
      const profile = profileBy.get(card.id);
      const suggestion = suggestPayToAvoidInterest({
        closingBalanceCents: closed?.closing_balance_cents ?? null,
        currentDebtCents: card.balance_cents,
        minimumCents:
          closed?.minimum_payment_cents ||
          open?.minimum_payment_cents ||
          profile?.minimum_payment_cents ||
          0,
      });
      return {
        accountId: card.id,
        accountName: card.name,
        dueOn: closed?.due_on ?? open?.due_on ?? today,
        minimumCents: suggestion.minimumCents,
        balanceCents: suggestion.avoidInterestCents,
      };
    });

    const forecast = projectCashflow({
      asOf: today,
      horizonDays: CASHFLOW_HORIZON,
      startingLiquidCents: liquid.reduce((s, a) => s + a.balance_cents, 0),
      plannedInflows: (planned ?? []).map((p) => ({
        id: p.id,
        label: p.label,
        amountCents: p.amount_cents,
        nextOn: p.next_on,
        frequency: p.frequency,
      })),
      subscriptions: (projectSubs ?? []).map((s) => ({
        id: s.id,
        name: s.name,
        amountCents: s.amount_cents,
        nextBillingOn: s.next_billing_on,
        frequency: s.frequency,
      })),
      creditObligations,
      installments: (installments ?? []).map((i) => ({
        id: i.id,
        label: i.label,
        installmentCents: i.installment_cents,
        nextDueOn: i.next_due_on,
        monthsRemaining: i.months_remaining,
      })),
    });

    if (forecast.status !== "shortfall" || !forecast.firstShortfallOn) continue;

    for (const member of members ?? []) {
      for (const channel of ["in_app", "email"] as const) {
        inserts.push({
          user_id: member.user_id,
          project_id: projectId,
          event_type: "cashflow_shortfall",
          channel,
          title: "Tu quincena · Posible faltante de liquidez",
          body: withHubLink(
            `Tu proyección a ${CASHFLOW_HORIZON} días muestra faltante desde ${forecast.firstShortfallOn} (~${formatMoney(money(forecast.shortfallCents))}).`,
          ),
          due_on: forecast.firstShortfallOn,
          dedupe_key: dedupeKey({
            userId: member.user_id,
            event: "cashflow_shortfall",
            channel,
            dueOn: forecast.firstShortfallOn,
          }),
        });
      }
    }
  }

  if (inserts.length > 0) {
    await admin.from("reminders").upsert(inserts, {
      onConflict: "dedupe_key",
      ignoreDuplicates: true,
    });
  }

  const { data: pendingEmail } = await admin
    .from("reminders")
    .select("*, profiles(email)")
    .eq("channel", "email")
    .eq("status", "pending")
    .lte("due_on", format(addDays(parseISO(today), LEAD_DAYS), "yyyy-MM-dd"));

  const apiKey = process.env.RESEND_API_KEY;
  const from =
    process.env.RESEND_FROM_EMAIL ?? "Cashish <onboarding@resend.dev>";
  let sent = 0;

  if (apiKey && pendingEmail && pendingEmail.length > 0) {
    const resend = new Resend(apiKey);
    for (const reminder of pendingEmail) {
      const email =
        reminder.profiles &&
        typeof reminder.profiles === "object" &&
        "email" in reminder.profiles
          ? String((reminder.profiles as { email: string | null }).email ?? "")
          : "";
      if (!email) continue;
      try {
        await resend.emails.send({
          from,
          to: email,
          subject: reminder.title,
          text: reminder.body,
        });
        await admin
          .from("reminders")
          .update({
            status: "sent",
            sent_at: new Date().toISOString(),
          })
          .eq("id", reminder.id);
        sent += 1;
      } catch {
        // Leave pending for retry
      }
    }
  } else if (!apiKey) {
    for (const reminder of pendingEmail ?? []) {
      await admin
        .from("reminders")
        .update({
          status: "sent",
          sent_at: new Date().toISOString(),
        })
        .eq("id", reminder.id);
      sent += 1;
    }
  }

  return {
    created: inserts.length,
    emailed: sent,
    today,
  };
}
