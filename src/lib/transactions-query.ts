import { asCurrency, currencyDecimals, formatMoney, money } from "@/lib/money";

export const TX_PAGE_SIZE = 25;
export const TX_EXPORT_MAX = 5000;

export type TxTypeFilter = "all" | "expense" | "income" | "transfer";

export type TransactionFilters = {
  q: string;
  type: TxTypeFilter;
  accountId: string;
  category: string;
  from: string;
  to: string;
  page: number;
};

const TYPE_LABELS: Record<string, string> = {
  expense: "Gasto",
  income: "Ingreso",
  transfer: "Transferencia",
};

export function typeLabel(type: string, transferId?: string | null): string {
  if (transferId) return TYPE_LABELS.transfer;
  return TYPE_LABELS[type] ?? type;
}

export function parseTransactionFilters(
  params: URLSearchParams | Record<string, string | string[] | undefined>,
): TransactionFilters {
  const get = (key: string): string => {
    if (params instanceof URLSearchParams) {
      return params.get(key)?.trim() ?? "";
    }
    const raw = params[key];
    if (Array.isArray(raw)) return (raw[0] ?? "").trim();
    return (raw ?? "").trim();
  };

  const typeRaw = get("type");
  const type: TxTypeFilter =
    typeRaw === "expense" ||
    typeRaw === "income" ||
    typeRaw === "transfer" ||
    typeRaw === "all"
      ? typeRaw
      : "all";

  const page = Math.max(1, Number.parseInt(get("page") || "1", 10) || 1);
  const dateRe = /^\d{4}-\d{2}-\d{2}$/;
  const from = dateRe.test(get("from")) ? get("from") : "";
  const to = dateRe.test(get("to")) ? get("to") : "";

  return {
    q: get("q").slice(0, 120),
    type,
    accountId: get("account"),
    category: get("category").slice(0, 80),
    from,
    to,
    page,
  };
}

/** Default range when none provided: current calendar month in Mexico. */
export function defaultMonthRange(todayIso: string): { from: string; to: string } {
  const [y, m] = todayIso.split("-").map(Number);
  const from = `${y}-${String(m).padStart(2, "0")}-01`;
  const last = new Date(y, m, 0).getDate();
  const to = `${y}-${String(m).padStart(2, "0")}-${String(last).padStart(2, "0")}`;
  return { from, to };
}

export function resolveDateRange(
  filters: TransactionFilters,
  todayIso: string,
): { from: string; to: string; usingDefault: boolean } {
  if (filters.from || filters.to) {
    return {
      from: filters.from || "2000-01-01",
      to: filters.to || todayIso,
      usingDefault: false,
    };
  }
  const range = defaultMonthRange(todayIso);
  return { ...range, usingDefault: true };
}

export function filtersToSearchParams(
  filters: Partial<TransactionFilters>,
  opts?: { omitDefaults?: boolean },
): URLSearchParams {
  const sp = new URLSearchParams();
  if (filters.q) sp.set("q", filters.q);
  if (filters.type && filters.type !== "all") sp.set("type", filters.type);
  if (filters.accountId) sp.set("account", filters.accountId);
  if (filters.category) sp.set("category", filters.category);
  if (filters.from) sp.set("from", filters.from);
  if (filters.to) sp.set("to", filters.to);
  if (filters.page && filters.page > 1) sp.set("page", String(filters.page));
  void opts;
  return sp;
}

export type ExportRow = {
  occurred_on: string;
  type: string;
  transfer_id: string | null;
  account_name: string;
  merchant: string | null;
  description: string | null;
  category: string | null;
  amount_cents: number;
  currency: string;
  id: string;
};

function csvEscape(value: string): string {
  if (/[",\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/** CSV with BOM for Excel (es-MX) compatibility. */
export function transactionsToCsv(rows: ExportRow[]): string {
  const header = [
    "Fecha",
    "Tipo",
    "Cuenta",
    "Comercio",
    "Descripcion",
    "Categoria",
    "Monto",
    "Moneda",
    "ID",
  ];
  const lines = [header.join(",")];
  for (const row of rows) {
    const signed =
      row.type === "income" && !row.transfer_id
        ? row.amount_cents
        : row.transfer_id
          ? row.amount_cents
          : -row.amount_cents;
    const ccy = asCurrency(row.currency);
    const decimals = currencyDecimals(ccy);
    const factor = 10 ** decimals;
    const monto = (signed / factor).toFixed(decimals);
    lines.push(
      [
        row.occurred_on,
        typeLabel(row.type, row.transfer_id),
        csvEscape(row.account_name),
        csvEscape(row.merchant ?? ""),
        csvEscape(row.description ?? ""),
        csvEscape(row.category ?? ""),
        monto,
        row.currency,
        row.id,
      ].join(","),
    );
  }
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

export function formatAmountPlain(cents: number, currency = "MXN"): string {
  return formatMoney(money(cents, asCurrency(currency)));
}

export function buildExportFilename(from: string, to: string, today: string): string {
  const a = from || "inicio";
  const b = to || today;
  return `cashish-movimientos_${a}_${b}.csv`;
}
