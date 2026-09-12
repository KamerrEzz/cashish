export type Cents = number;

/** Supported ledger currencies (LATAM). Amounts are integer minor units. */
export const CURRENCIES = ["MXN", "COP", "PEN", "CLP"] as const;
export type Currency = (typeof CURRENCIES)[number];

export const CURRENCY_META: Record<
  Currency,
  { label: string; short: string; locale: string; decimals: number }
> = {
  MXN: {
    label: "Peso mexicano (MXN)",
    short: "MXN",
    locale: "es-MX",
    decimals: 2,
  },
  COP: {
    label: "Peso colombiano (COP)",
    short: "COP",
    locale: "es-CO",
    decimals: 2,
  },
  PEN: {
    label: "Sol peruano (PEN)",
    short: "PEN",
    locale: "es-PE",
    decimals: 2,
  },
  CLP: {
    label: "Peso chileno (CLP)",
    short: "CLP",
    locale: "es-CL",
    decimals: 0,
  },
};

export function isCurrency(value: string): value is Currency {
  return (CURRENCIES as readonly string[]).includes(value);
}

export function asCurrency(value: string | null | undefined): Currency {
  if (value && isCurrency(value)) return value;
  return "MXN";
}

export function currencyDecimals(currency: Currency): number {
  return CURRENCY_META[currency].decimals;
}

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

/**
 * Parse user decimal input into minor units for the given currency.
 * CLP has 0 decimals (whole pesos); MXN/COP/PEN use 2.
 */
export function parseMoneyInput(raw: string, currency: Currency): Money {
  const trimmed = raw.trim().replace(/,/g, "");
  const decimals = currencyDecimals(currency);

  if (decimals === 0) {
    if (!/^-?\d+$/.test(trimmed)) {
      throw new Error("Monto inválido. Para CLP usa enteros sin decimales.");
    }
    const units = Number.parseInt(trimmed, 10);
    if (!Number.isFinite(units)) {
      throw new Error("Monto inválido.");
    }
    return money(units, currency);
  }

  if (!new RegExp(`^-?\\d+(\\.\\d{1,${decimals}})?$`).test(trimmed)) {
    throw new Error(`Monto inválido. Usa hasta ${decimals} decimales.`);
  }
  const negative = trimmed.startsWith("-");
  const [whole, frac = ""] = trimmed.replace("-", "").split(".");
  const factor = 10 ** decimals;
  const pad = "0".repeat(decimals);
  const minor =
    Number.parseInt(whole, 10) * factor +
    Number.parseInt((frac + pad).slice(0, decimals), 10);
  return money(negative ? -minor : minor, currency);
}

/** @deprecated Prefer parseMoneyInput(raw, currency). MXN wrapper. */
export function parseMxnInput(raw: string): Money {
  return parseMoneyInput(raw, "MXN");
}

export function formatMoney(m: Money): string {
  const meta = CURRENCY_META[m.currency];
  const factor = 10 ** meta.decimals;
  return new Intl.NumberFormat(meta.locale, {
    style: "currency",
    currency: m.currency,
    minimumFractionDigits: meta.decimals,
    maximumFractionDigits: meta.decimals,
  }).format(m.amount / factor);
}

/** @deprecated Prefer formatMoney. MXN-only wrapper. */
export function formatMxn(m: Money, _locale = "es-MX"): string {
  if (m.currency !== "MXN") {
    throw new Error(`formatMxn only supports MXN, got ${m.currency}`);
  }
  return formatMoney(m);
}

/** Sum minor amounts that already share a currency (caller groups first). */
export function sumMinor(amounts: number[], currency: Currency): Money {
  let total = 0;
  for (const a of amounts) {
    if (!Number.isInteger(a)) {
      throw new Error(`Amount must be an integer number of cents, got ${a}`);
    }
    total += a;
  }
  return money(total, currency);
}

/** Group rows by currency and sum — never mixes currencies. */
export function sumByCurrency(
  rows: ReadonlyArray<{ amountCents: number; currency: string }>,
): Money[] {
  const map = new Map<Currency, number>();
  for (const row of rows) {
    const c = asCurrency(row.currency);
    map.set(c, (map.get(c) ?? 0) + row.amountCents);
  }
  return CURRENCIES.filter((c) => map.has(c)).map((c) =>
    money(map.get(c)!, c),
  );
}
