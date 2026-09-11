import {
  addMonths,
  format,
  isBefore,
  isEqual,
  setDate,
  startOfDay,
} from "date-fns";

function clampDay(year: number, monthIndex: number, day: number): Date {
  // monthIndex 0-based; days 1-28 only in our domain, so setDate is safe
  return setDate(new Date(year, monthIndex, 1), day);
}

/** Next occurrence of `dayOfMonth` on or after `from` (inclusive). */
export function nextDayOfMonthOnOrAfter(from: Date, dayOfMonth: number): Date {
  const base = startOfDay(from);
  let candidate = clampDay(base.getFullYear(), base.getMonth(), dayOfMonth);
  if (isBefore(candidate, base)) {
    const next = addMonths(candidate, 1);
    candidate = clampDay(next.getFullYear(), next.getMonth(), dayOfMonth);
  }
  return candidate;
}

export function buildInitialStatementWindow(
  closeDay: number,
  dueDay: number,
  today = new Date(),
): { opensOn: string; closesOn: string; dueOn: string } {
  const closes = nextDayOfMonthOnOrAfter(today, closeDay);
  // Open date: day after previous close
  const prevClose = addMonths(closes, -1);
  const opens = new Date(prevClose);
  opens.setDate(opens.getDate() + 1);

  let due = clampDay(closes.getFullYear(), closes.getMonth(), dueDay);
  if (isBefore(due, closes) || isEqual(due, closes)) {
    const next = addMonths(due, 1);
    due = clampDay(next.getFullYear(), next.getMonth(), dueDay);
  }

  return {
    opensOn: format(opens, "yyyy-MM-dd"),
    closesOn: format(closes, "yyyy-MM-dd"),
    dueOn: format(due, "yyyy-MM-dd"),
  };
}

/** After closing a statement on `previousClosesOn`, compute the next open cycle. */
export function buildNextStatementWindow(
  previousClosesOn: string,
  closeDay: number,
  dueDay: number,
): { opensOn: string; closesOn: string; dueOn: string } {
  const prevClose = startOfDay(new Date(`${previousClosesOn}T12:00:00`));
  const opens = new Date(prevClose);
  opens.setDate(opens.getDate() + 1);

  let closes = clampDay(opens.getFullYear(), opens.getMonth(), closeDay);
  if (!isBefore(prevClose, closes)) {
    const next = addMonths(closes, 1);
    closes = clampDay(next.getFullYear(), next.getMonth(), closeDay);
  }

  let due = clampDay(closes.getFullYear(), closes.getMonth(), dueDay);
  if (isBefore(due, closes) || isEqual(due, closes)) {
    const next = addMonths(due, 1);
    due = clampDay(next.getFullYear(), next.getMonth(), dueDay);
  }

  return {
    opensOn: format(opens, "yyyy-MM-dd"),
    closesOn: format(closes, "yyyy-MM-dd"),
    dueOn: format(due, "yyyy-MM-dd"),
  };
}

export function availableCreditCents(
  creditLimitCents: number,
  balanceOwedCents: number,
): number {
  return creditLimitCents - balanceOwedCents;
}

export function todayMexico(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

export const ACCOUNT_TYPE_LABELS: Record<string, string> = {
  cash: "Efectivo",
  checking: "Débito / cheques",
  savings: "Ahorros",
  credit_card: "Tarjeta de crédito",
};
