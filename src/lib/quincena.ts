import { addDays, format, parseISO } from "date-fns";
import type { SupabaseClient } from "@supabase/supabase-js";
import {
  projectCashflow,
  suggestPayToAvoidInterest,
  type CashflowResult,
} from "@/lib/cashflow/engine";
import { todayMexico } from "@/lib/credit-cycle";
import type { Database } from "@/lib/database.types";

export type DailyBalancePoint = {
  date: string;
  balanceCents: number;
};

export function quincenaWindowLabel(asOf: string): {
  start: string;
  end: string;
  label: string;
} {
  const start = parseISO(`${asOf}T12:00:00`);
  const end = addDays(start, 14);
  const fmt = (d: Date) =>
    new Intl.DateTimeFormat("es-MX", {
      day: "numeric",
      month: "short",
    }).format(d);
  return {
    start: asOf,
    end: format(end, "yyyy-MM-dd"),
    label: `Quincena del ${fmt(start)} – ${fmt(end)}`,
  };
}

export function dailyBalancesFromForecast(
  forecast: CashflowResult,
): DailyBalancePoint[] {
  const byDate = new Map<string, number>();
  for (const ev of forecast.events) {
    byDate.set(ev.date, (byDate.get(ev.date) ?? 0) + ev.amountCents);
  }
  const points: DailyBalancePoint[] = [];
  let balance = forecast.startingLiquidCents;
  const start = parseISO(`${forecast.asOf}T12:00:00`);
  for (let i = 0; i <= forecast.horizonDays; i += 1) {
    const date = format(addDays(start, i), "yyyy-MM-dd");
    balance += byDate.get(date) ?? 0;
    points.push({ date, balanceCents: balance });
  }
  return points;
}

export type QuincenaPayAction = {
  accountId: string;
  accountName: string;
  dueOn: string;
  minimumCents: number;
  avoidInterestCents: number;
  mode: "avoid_interest" | "minimum";
};

export type QuincenaSnapshot = {
  today: string;
  window: ReturnType<typeof quincenaWindowLabel>;
  forecast: CashflowResult;
  daily: ReturnType<typeof dailyBalancesFromForecast>;
  primaryPay: QuincenaPayAction | null;
  upcomingSubs: Array<{
    id: string;
    name: string;
    amountCents: number;
    nextBillingOn: string;
  }>;
  upcomingCloses: Array<{
    accountId: string;
    accountName: string;
    closesOn: string;
  }>;
};

export async function loadQuincenaSnapshot(
  supabase: SupabaseClient<Database>,
  projectId: string,
  horizonDays = 30,
): Promise<QuincenaSnapshot> {
  const today = todayMexico();
  const [
    { data: accounts },
    { data: profiles },
    { data: openPeriods },
    { data: closedPeriods },
    { data: subscriptions },
    { data: planned },
    { data: installments },
  ] = await Promise.all([
    supabase
      .from("accounts")
      .select("*")
      .eq("project_id", projectId)
      .eq("is_archived", false),
    supabase
      .from("credit_card_profiles")
      .select("*")
      .eq("project_id", projectId),
    supabase
      .from("statement_periods")
      .select("*")
      .eq("project_id", projectId)
      .eq("status", "open"),
    supabase
      .from("statement_periods")
      .select("*")
      .eq("project_id", projectId)
      .eq("status", "closed")
      .order("closes_on", { ascending: false }),
    supabase
      .from("subscriptions")
      .select("*")
      .eq("project_id", projectId)
      .eq("is_active", true),
    supabase
      .from("planned_inflows")
      .select("*")
      .eq("project_id", projectId)
      .eq("is_active", true),
    supabase
      .from("installment_plans")
      .select("*")
      .eq("project_id", projectId)
      .eq("is_active", true),
  ]);

  const liquid = (accounts ?? []).filter((a) => a.type !== "credit_card");
  const cards = (accounts ?? []).filter((a) => a.type === "credit_card");
  const profileBy = new Map((profiles ?? []).map((p) => [p.account_id, p]));
  const openBy = new Map((openPeriods ?? []).map((p) => [p.account_id, p]));
  const closedByAccount = new Map<
    string,
    {
      account_id: string;
      due_on: string;
      closing_balance_cents: number | null;
      minimum_payment_cents: number;
    }
  >();
  for (const p of closedPeriods ?? []) {
    if (!closedByAccount.has(p.account_id)) closedByAccount.set(p.account_id, p);
  }

  const startingLiquidCents = liquid.reduce((s, a) => s + a.balance_cents, 0);

  const creditObligations = cards.map((card) => {
    const open = openBy.get(card.id);
    const closed = closedByAccount.get(card.id);
    const profile = profileBy.get(card.id);
    const dueOn = closed?.due_on ?? open?.due_on ?? today;
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
      dueOn,
      minimumCents: suggestion.minimumCents,
      balanceCents: suggestion.avoidInterestCents,
      avoidInterestCents: suggestion.avoidInterestCents,
    };
  });

  const forecast = projectCashflow({
    asOf: today,
    horizonDays,
    startingLiquidCents,
    plannedInflows: (planned ?? []).map((p) => ({
      id: p.id,
      label: p.label,
      amountCents: p.amount_cents,
      nextOn: p.next_on,
      frequency: p.frequency,
    })),
    subscriptions: (subscriptions ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      amountCents: s.amount_cents,
      nextBillingOn: s.next_billing_on,
      frequency: s.frequency,
    })),
    creditObligations: creditObligations.map((c) => ({
      accountId: c.accountId,
      accountName: c.accountName,
      dueOn: c.dueOn,
      minimumCents: c.minimumCents,
      balanceCents: c.balanceCents,
    })),
    installments: (installments ?? []).map((i) => ({
      id: i.id,
      label: i.label,
      installmentCents: i.installment_cents,
      nextDueOn: i.next_due_on,
      monthsRemaining: i.months_remaining,
    })),
  });

  const windowEnd = quincenaWindowLabel(today).end;
  const dueSoon = [...creditObligations]
    .filter((c) => c.dueOn >= today && c.dueOn <= windowEnd && c.avoidInterestCents > 0)
    .sort((a, b) => a.dueOn.localeCompare(b.dueOn));

  const primaryPay: QuincenaPayAction | null = dueSoon[0]
    ? {
        accountId: dueSoon[0].accountId,
        accountName: dueSoon[0].accountName,
        dueOn: dueSoon[0].dueOn,
        minimumCents: dueSoon[0].minimumCents,
        avoidInterestCents: dueSoon[0].avoidInterestCents,
        mode: "avoid_interest",
      }
    : creditObligations.find((c) => c.avoidInterestCents > 0)
      ? (() => {
          const c = creditObligations.find((x) => x.avoidInterestCents > 0)!;
          return {
            accountId: c.accountId,
            accountName: c.accountName,
            dueOn: c.dueOn,
            minimumCents: c.minimumCents,
            avoidInterestCents: c.avoidInterestCents,
            mode: "avoid_interest" as const,
          };
        })()
      : null;

  const upcomingSubs = (subscriptions ?? [])
    .filter((s) => s.next_billing_on >= today)
    .sort((a, b) => a.next_billing_on.localeCompare(b.next_billing_on))
    .slice(0, 3)
    .map((s) => ({
      id: s.id,
      name: s.name,
      amountCents: s.amount_cents,
      nextBillingOn: s.next_billing_on,
    }));

  const nameById = new Map((accounts ?? []).map((a) => [a.id, a.name]));
  const upcomingCloses = (openPeriods ?? [])
    .filter((p) => p.closes_on >= today)
    .sort((a, b) => a.closes_on.localeCompare(b.closes_on))
    .slice(0, 3)
    .map((p) => ({
      accountId: p.account_id,
      accountName: nameById.get(p.account_id) ?? "TDC",
      closesOn: p.closes_on,
    }));

  return {
    today,
    window: quincenaWindowLabel(today),
    forecast,
    daily: dailyBalancesFromForecast(forecast),
    primaryPay,
    upcomingSubs,
    upcomingCloses,
  };
}
