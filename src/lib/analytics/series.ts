/** Pure helpers to shape transaction rows for analytics charts. */

export type TxLite = {
  type: string;
  amount_cents: number;
  occurred_on: string;
  merchant?: string | null;
  category?: string | null;
  transfer_id?: string | null;
};

export type DailyFlowPoint = {
  date: string;
  label: string;
  income: number;
  expense: number;
  net: number;
};

export type CategorySlice = {
  name: string;
  cents: number;
  pct: number;
};

export type MerchantBar = {
  name: string;
  cents: number;
};

function dayLabel(iso: string) {
  const d = new Date(`${iso}T12:00:00`);
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
  }).format(d);
}

/** Build daily income/expense series between from..to (inclusive). */
export function buildDailyFlow(
  txs: TxLite[],
  from: string,
  to: string,
): DailyFlowPoint[] {
  const map = new Map<string, { income: number; expense: number }>();
  const start = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);
  for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    const key = `${y}-${m}-${day}`;
    map.set(key, { income: 0, expense: 0 });
  }
  for (const t of txs) {
    if (t.transfer_id) continue;
    const bucket = map.get(t.occurred_on);
    if (!bucket) continue;
    if (t.type === "income") bucket.income += t.amount_cents;
    else if (t.type === "expense") bucket.expense += t.amount_cents;
  }
  return [...map.entries()].map(([date, v]) => ({
    date,
    label: dayLabel(date),
    income: v.income / 100,
    expense: v.expense / 100,
    net: (v.income - v.expense) / 100,
  }));
}

export function buildCategoryBreakdown(
  txs: TxLite[],
  limit = 8,
): CategorySlice[] {
  const map = new Map<string, number>();
  let total = 0;
  for (const t of txs) {
    if (t.type !== "expense" || t.transfer_id) continue;
    const name = (t.category || "Sin categoría").trim() || "Sin categoría";
    map.set(name, (map.get(name) ?? 0) + t.amount_cents);
    total += t.amount_cents;
  }
  const sorted = [...map.entries()].sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, limit);
  const rest = sorted.slice(limit).reduce((s, [, c]) => s + c, 0);
  const slices = top.map(([name, cents]) => ({
    name,
    cents,
    pct: total > 0 ? Math.round((cents / total) * 100) : 0,
  }));
  if (rest > 0) {
    slices.push({
      name: "Otros",
      cents: rest,
      pct: total > 0 ? Math.round((rest / total) * 100) : 0,
    });
  }
  return slices;
}

export function buildMerchantBars(txs: TxLite[], limit = 8): MerchantBar[] {
  const map = new Map<string, number>();
  for (const t of txs) {
    if (t.type !== "expense" || t.transfer_id) continue;
    const name = (t.merchant || t.category || "Sin nombre").trim() || "Sin nombre";
    map.set(name, (map.get(name) ?? 0) + t.amount_cents);
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, cents]) => ({ name, cents }));
}

export function monthCompare(
  currentExpense: number,
  previousExpense: number,
): { deltaCents: number; deltaPct: number | null } {
  const deltaCents = currentExpense - previousExpense;
  const deltaPct =
    previousExpense > 0
      ? Math.round((deltaCents / previousExpense) * 100)
      : null;
  return { deltaCents, deltaPct };
}
