import { addDays, addMonths, addWeeks, addYears, format, parseISO } from "date-fns";

export type CashflowEventKind =
  | "planned_inflow"
  | "subscription"
  | "cc_minimum"
  | "cc_due_balance"
  | "installment";

export type CashflowEvent = {
  date: string;
  kind: CashflowEventKind;
  label: string;
  amountCents: number; // +inflow / -outflow for liquid
  meta?: Record<string, string | number | null>;
};

export type CashflowInput = {
  asOf: string; // YYYY-MM-DD
  horizonDays: number;
  startingLiquidCents: number;
  plannedInflows: Array<{
    id: string;
    label: string;
    amountCents: number;
    nextOn: string;
    frequency: "weekly" | "monthly" | "yearly";
  }>;
  subscriptions: Array<{
    id: string;
    name: string;
    amountCents: number;
    nextBillingOn: string;
    frequency: "weekly" | "monthly" | "yearly";
  }>;
  creditObligations: Array<{
    accountId: string;
    accountName: string;
    dueOn: string;
    minimumCents: number;
    balanceCents: number; // debt to avoid interest (closing or current)
  }>;
  installments: Array<{
    id: string;
    label: string;
    installmentCents: number;
    nextDueOn: string;
    monthsRemaining: number;
  }>;
};

export type CashflowResult = {
  asOf: string;
  horizonDays: number;
  startingLiquidCents: number;
  endingLiquidCents: number;
  events: CashflowEvent[];
  status: "coverage_ok" | "shortfall";
  firstShortfallOn: string | null;
  shortfallCents: number;
  minBalanceCents: number;
};

function advance(
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

function expandRecurring(
  start: string,
  end: string,
  nextOn: string,
  frequency: "weekly" | "monthly" | "yearly",
  maxOccurrences: number,
): string[] {
  const dates: string[] = [];
  let cursor = nextOn;
  let guard = 0;
  while (cursor < start && guard < 120) {
    cursor = advance(cursor, frequency);
    guard += 1;
  }
  while (cursor <= end && dates.length < maxOccurrences) {
    if (cursor >= start) dates.push(cursor);
    cursor = advance(cursor, frequency);
  }
  return dates;
}

export function projectCashflow(input: CashflowInput): CashflowResult {
  const end = format(
    addDays(parseISO(`${input.asOf}T12:00:00`), input.horizonDays),
    "yyyy-MM-dd",
  );
  const events: CashflowEvent[] = [];

  for (const inflow of input.plannedInflows) {
    for (const date of expandRecurring(
      input.asOf,
      end,
      inflow.nextOn,
      inflow.frequency,
      8,
    )) {
      events.push({
        date,
        kind: "planned_inflow",
        label: inflow.label,
        amountCents: inflow.amountCents,
        meta: { id: inflow.id },
      });
    }
  }

  for (const sub of input.subscriptions) {
    for (const date of expandRecurring(
      input.asOf,
      end,
      sub.nextBillingOn,
      sub.frequency,
      12,
    )) {
      events.push({
        date,
        kind: "subscription",
        label: sub.name,
        amountCents: -sub.amountCents,
        meta: { id: sub.id },
      });
    }
  }

  for (const cc of input.creditObligations) {
    if (cc.dueOn >= input.asOf && cc.dueOn <= end) {
      events.push({
        date: cc.dueOn,
        kind: "cc_minimum",
        label: `Mínimo ${cc.accountName}`,
        amountCents: -cc.minimumCents,
        meta: {
          accountId: cc.accountId,
          balanceCents: cc.balanceCents,
        },
      });
    }
  }

  for (const plan of input.installments) {
    let due = plan.nextDueOn;
    let remaining = plan.monthsRemaining;
    let guard = 0;
    while (remaining > 0 && due <= end && guard < 48) {
      if (due >= input.asOf) {
        events.push({
          date: due,
          kind: "installment",
          label: plan.label,
          amountCents: -plan.installmentCents,
          meta: { id: plan.id },
        });
      }
      due = advance(due, "monthly");
      remaining -= 1;
      guard += 1;
    }
  }

  events.sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date);
    return a.amountCents - b.amountCents;
  });

  let balance = input.startingLiquidCents;
  let minBalance = balance;
  let firstShortfallOn: string | null = null;
  let worstShortfall = 0;

  for (const ev of events) {
    balance += ev.amountCents;
    if (balance < minBalance) minBalance = balance;
    if (balance < 0) {
      if (!firstShortfallOn) firstShortfallOn = ev.date;
      if (balance < worstShortfall) worstShortfall = balance;
    }
  }

  return {
    asOf: input.asOf,
    horizonDays: input.horizonDays,
    startingLiquidCents: input.startingLiquidCents,
    endingLiquidCents: balance,
    events,
    status: firstShortfallOn ? "shortfall" : "coverage_ok",
    firstShortfallOn,
    shortfallCents: firstShortfallOn ? Math.abs(worstShortfall) : 0,
    minBalanceCents: minBalance,
  };
}

/** Split a purchase into N monthly installments (MSI). */
export function buildInstallmentSchedule(input: {
  totalCents: number;
  months: number;
  firstDueOn: string;
}): { installmentCents: number; months: number; nextDueOn: string } {
  if (input.months < 2 || input.months > 48) {
    throw new Error("MSI debe ser entre 2 y 48 meses");
  }
  if (input.totalCents <= 0) throw new Error("Monto inválido");
  const installmentCents = Math.ceil(input.totalCents / input.months);
  return {
    installmentCents,
    months: input.months,
    nextDueOn: input.firstDueOn,
  };
}

export function suggestPayToAvoidInterest(input: {
  closingBalanceCents: number | null;
  currentDebtCents: number;
  minimumCents: number;
}): { minimumCents: number; avoidInterestCents: number } {
  const avoid =
    input.closingBalanceCents != null && input.closingBalanceCents > 0
      ? input.closingBalanceCents
      : Math.max(input.currentDebtCents, 0);
  return {
    minimumCents: Math.max(0, input.minimumCents),
    avoidInterestCents: Math.max(avoid, input.minimumCents),
  };
}
