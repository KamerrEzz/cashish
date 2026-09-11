import { addDays, format, parseISO } from "date-fns";
import { Resend } from "resend";
import { createServiceClient } from "@/lib/supabase/admin";
import { formatMxn, money } from "@/lib/money";
import { todayMexico } from "@/lib/credit-cycle";

const LEAD_DAYS = 3;

type ReminderInsert = {
  user_id: string;
  event_type: "statement_close" | "payment_due" | "subscription_charge";
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
          event_type: "payment_due",
          channel,
          title: `Pago de tarjeta: ${account.name}`,
          body: `Fecha límite ${period.due_on}. Saldo de referencia ${formatMxn(money(balance))}. Mínimo ${formatMxn(money(period.minimum_payment_cents))}.`,
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
        event_type: "subscription_charge",
        channel,
        title: `Cobro de ${sub.name}`,
        body: `${sub.name} (${sub.merchant}) se cobra el ${sub.next_billing_on} en ${accountName} por ${formatMxn(money(sub.amount_cents))}.`,
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
