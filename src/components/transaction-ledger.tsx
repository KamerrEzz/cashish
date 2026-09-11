import Link from "next/link";
import { MoneyTone } from "@/components/empty-state";
import { typeLabel } from "@/lib/transactions-query";
import { formatWeekdayDate } from "@/lib/dates";

export type LedgerRow = {
  id: string;
  type: string;
  amount_cents: number;
  merchant: string | null;
  description: string | null;
  category: string | null;
  occurred_on: string;
  transfer_id: string | null;
  account_name: string;
};

export function TransactionLedger({
  rows,
  total,
  page,
  pageSize,
  baseQuery,
}: {
  rows: LedgerRow[];
  total: number;
  page: number;
  pageSize: number;
  baseQuery: string;
}) {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  function pageHref(p: number) {
    const sp = new URLSearchParams(baseQuery);
    if (p <= 1) sp.delete("page");
    else sp.set("page", String(p));
    const q = sp.toString();
    return q ? `/app/transactions?${q}` : "/app/transactions";
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-10 text-center sm:px-6">
        <p className="font-[family-name:var(--font-display)] text-lg text-[var(--ink)]">
          Sin movimientos en este rango
        </p>
        <p className="mx-auto mt-2 max-w-md text-sm text-[var(--muted)]">
          Ajusta fechas o filtros, o registra un gasto/ingreso abajo.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] px-4 py-3 text-xs text-[var(--muted)] sm:px-5">
        <span>
          Mostrando{" "}
          <strong className="text-[var(--ink)]">
            {from}–{to}
          </strong>{" "}
          de <strong className="text-[var(--ink)]">{total}</strong>
        </span>
        <span>
          Página {page} / {totalPages}
        </span>
      </div>

      {/* Mobile cards */}
      <ul className="divide-y divide-[var(--line)] md:hidden">
        {rows.map((row) => (
          <li key={row.id} className="px-4 py-3">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="truncate font-medium text-[var(--ink)]">
                  {row.merchant || row.description || typeLabel(row.type, row.transfer_id)}
                </p>
                <p className="mt-0.5 text-xs text-[var(--muted)]">
                  {formatWeekdayDate(row.occurred_on)} · {row.account_name} ·{" "}
                  {typeLabel(row.type, row.transfer_id)}
                  {row.category ? ` · ${row.category}` : ""}
                </p>
              </div>
              <MoneyTone
                cents={row.amount_cents}
                type={row.transfer_id ? "transfer" : row.type}
                className="shrink-0 text-sm font-medium"
              />
            </div>
          </li>
        ))}
      </ul>

      {/* Desktop table */}
      <div className="hidden overflow-x-auto md:block">
        <table className="w-full min-w-[720px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--line)] bg-[var(--wash)]/60 text-xs uppercase tracking-wide text-[var(--muted)]">
              <th className="px-4 py-2.5 font-medium sm:px-5">Fecha</th>
              <th className="px-3 py-2.5 font-medium">Concepto</th>
              <th className="px-3 py-2.5 font-medium">Cuenta</th>
              <th className="px-3 py-2.5 font-medium">Tipo</th>
              <th className="px-3 py-2.5 font-medium">Categoría</th>
              <th className="px-4 py-2.5 text-right font-medium sm:px-5">Monto</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.id}
                className="border-b border-[var(--line)] last:border-0 hover:bg-[var(--wash)]/40"
              >
                <td className="whitespace-nowrap px-4 py-2.5 tabular-nums text-[var(--muted)] sm:px-5">
                  {row.occurred_on}
                </td>
                <td className="max-w-[220px] px-3 py-2.5">
                  <p className="truncate font-medium text-[var(--ink)]">
                    {row.merchant || row.description || "—"}
                  </p>
                  {row.description && row.merchant ? (
                    <p className="truncate text-xs text-[var(--muted)]">
                      {row.description}
                    </p>
                  ) : null}
                </td>
                <td className="max-w-[140px] truncate px-3 py-2.5 text-[var(--muted)]">
                  {row.account_name}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 text-[var(--muted)]">
                  {typeLabel(row.type, row.transfer_id)}
                </td>
                <td className="max-w-[120px] truncate px-3 py-2.5 text-[var(--muted)]">
                  {row.category || "—"}
                </td>
                <td className="px-4 py-2.5 text-right sm:px-5">
                  <MoneyTone
                    cents={row.amount_cents}
                    type={row.transfer_id ? "transfer" : row.type}
                    className="font-medium"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3 border-t border-[var(--line)] px-4 py-3 sm:px-5">
          {page > 1 ? (
            <Link
              href={pageHref(page - 1)}
              className="text-sm font-medium text-[var(--accent)] hover:underline"
            >
              ← Anterior
            </Link>
          ) : (
            <span className="text-sm text-[var(--muted)]">← Anterior</span>
          )}
          {page < totalPages ? (
            <Link
              href={pageHref(page + 1)}
              className="text-sm font-medium text-[var(--accent)] hover:underline"
            >
              Siguiente →
            </Link>
          ) : (
            <span className="text-sm text-[var(--muted)]">Siguiente →</span>
          )}
        </div>
      ) : null}
    </div>
  );
}
