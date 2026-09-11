import { requireUser } from "@/lib/auth";
import { Mxn, PageHeader, Panel } from "@/components/ui";
import { EmptyState, MoneyTone, SectionTitle } from "@/components/empty-state";
import { TransactionForms } from "@/components/transaction-forms";

export default async function TransactionsPage() {
  const { supabase } = await requireUser();
  const [{ data: accounts }, { data: txs }] = await Promise.all([
    supabase
      .from("accounts")
      .select("*")
      .eq("is_archived", false)
      .order("name"),
    supabase
      .from("transactions")
      .select("*, accounts(name)")
      .order("occurred_on", { ascending: false })
      .limit(50),
  ]);

  const recent = txs ?? [];
  const income = recent
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount_cents, 0);
  const expense = recent
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount_cents, 0);

  return (
    <div className="dash-enter space-y-8">
      <PageHeader
        title="Movimientos"
        subtitle="El diario de tu dinero: ingresos, gastos y transferencias."
      />

      {(accounts ?? []).length > 0 ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <Panel className="!p-4">
            <p className="text-xs text-[var(--muted)]">Ingresos (lista)</p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-xl text-[var(--positive)] tabular-nums">
              <Mxn cents={income} />
            </p>
          </Panel>
          <Panel className="!p-4">
            <p className="text-xs text-[var(--muted)]">Gastos (lista)</p>
            <p className="mt-1 font-[family-name:var(--font-display)] text-xl tabular-nums">
              <Mxn cents={expense} />
            </p>
          </Panel>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <SectionTitle
            title="Registrar"
            subtitle="Una captura limpia, sin fricción"
          />
          {(accounts ?? []).length === 0 ? (
            <EmptyState
              title="Necesitas una cuenta"
              body="Crea al menos un débito o efectivo para empezar a registrar."
              actionHref="/app/accounts/new"
              actionLabel="Nueva cuenta"
            />
          ) : (
            <TransactionForms accounts={accounts ?? []} />
          )}
        </Panel>
        <Panel>
          <SectionTitle
            title="Recientes"
            subtitle="Últimos movimientos capturados"
          />
          {recent.length === 0 ? (
            <EmptyState
              title="Sin movimientos"
              body="Cuando registres un gasto o ingreso, aparecerá aquí con fecha y cuenta."
            />
          ) : (
            <ul className="divide-y divide-[var(--line)]">
              {recent.map((tx) => {
                const accountName =
                  tx.accounts &&
                  typeof tx.accounts === "object" &&
                  "name" in tx.accounts
                    ? String((tx.accounts as { name: string }).name)
                    : "—";
                return (
                  <li
                    key={tx.id}
                    className="flex justify-between gap-3 py-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[var(--ink)]">
                        {tx.merchant || tx.description || tx.type}
                      </p>
                      <p className="text-xs text-[var(--muted)]">
                        {tx.occurred_on} · {accountName} · {tx.type}
                      </p>
                    </div>
                    <MoneyTone cents={tx.amount_cents} type={tx.type} />
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
