export type Cents = number;
export type Currency = "MXN";

export interface Money {
  amount: Cents;
  currency: Currency;
}

export type Rounding = "half-up" | "ceil" | "floor";

function roundBy(value: number, rounding: Rounding): number {
  switch (rounding) {
    case "half-up":
      return Math.round(value);
    case "ceil":
      return Math.ceil(value);
    case "floor":
      return Math.floor(value);
  }
}

export function money(amount: Cents, currency: Currency = "MXN"): Money {
  if (!Number.isInteger(amount)) {
    throw new Error(`Amount must be an integer number of cents, got ${amount}`);
  }
  return { amount, currency };
}

export function assertSameCurrency(a: Money, b: Money): void {
  if (a.currency !== b.currency) {
    throw new Error(
      `Cannot operate on different currencies: ${a.currency} and ${b.currency}`,
    );
  }
}

export function sameMoney(a: Money, b: Money): boolean {
  return a.currency === b.currency && a.amount === b.amount;
}

export function addMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amount + b.amount, a.currency);
}

export function subMoney(a: Money, b: Money): Money {
  assertSameCurrency(a, b);
  return money(a.amount - b.amount, a.currency);
}

export function mulMoney(
  m: Money,
  factor: number,
  rounding: Rounding = "half-up",
): Money {
  return money(roundBy(m.amount * factor, rounding), m.currency);
}

export function pctOf(
  m: Money,
  pct: number,
  rounding: Rounding = "half-up",
): Money {
  return money(roundBy((m.amount * pct) / 100, rounding), m.currency);
}

export function splitEvenly(m: Money, parts: number): Money[] {
  if (!Number.isInteger(parts) || parts <= 0) {
    throw new Error(`parts must be a positive integer, got ${parts}`);
  }
  const base = Math.floor(m.amount / parts);
  const remainder = m.amount - base * parts;
  return Array.from({ length: parts }, (_, i) =>
    money(i === 0 ? base + remainder : base, m.currency),
  );
}

export function splitByPct(m: Money, pcts: number[]): Money[] {
  const rawParts = pcts.map((pct) => Math.floor((m.amount * pct) / 100));
  const sum = rawParts.reduce((acc, part) => acc + part, 0);
  const remainder = m.amount - sum;
  return rawParts.map((part, i) =>
    money(i === 0 ? part + remainder : part, m.currency),
  );
}

/** Parse user decimal input like "229.50" → Money. Rejects non-finite / too many decimals. */
export function parseMxnInput(raw: string): Money {
  const trimmed = raw.trim().replace(/,/g, "");
  if (!/^-?\d+(\.\d{1,2})?$/.test(trimmed)) {
    throw new Error("Monto inválido. Usa hasta 2 decimales.");
  }
  const negative = trimmed.startsWith("-");
  const [whole, frac = ""] = trimmed.replace("-", "").split(".");
  const cents =
    Number.parseInt(whole, 10) * 100 +
    Number.parseInt((frac + "00").slice(0, 2), 10);
  return money(negative ? -cents : cents, "MXN");
}

export function formatMxn(m: Money, locale = "es-MX"): string {
  if (m.currency !== "MXN") {
    throw new Error(`formatMxn only supports MXN, got ${m.currency}`);
  }
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "MXN",
  }).format(m.amount / 100);
}
