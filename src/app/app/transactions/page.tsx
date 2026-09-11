import { requireUser } from "@/lib/auth";
import { Mxn, PageHeader, Panel } from "@/components/ui";
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
      .limit(40),
  ]);

  return (
    <div>
      <PageHeader
        title="Movimientos"
        subtitle="Gastos, ingresos y pagos vinculados a tarjeta."
      />
      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <h2 className="mb-3 font-semibold">Registrar</h2>
          {(accounts ?? []).length === 0 ? (
            <p className="text-sm text-[var(--muted)]">
              Crea una cuenta primero.
            </p>
          ) : (
            <TransactionForms accounts={accounts ?? []} />
          )}
        </Panel>
        <Panel>
          <h2 className="mb-3 font-semibold">Recientes</h2>
          <ul className="divide-y divide-[var(--line)]">
            {(txs ?? []).map((tx) => {
              const accountName =
                tx.accounts &&
                typeof tx.accounts === "object" &&
                "name" in tx.accounts
                  ? String((tx.accounts as { name: string }).name)
                  : "—";
              return (
                <li
                  key={tx.id}
                  className="flex justify-between gap-2 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {tx.merchant || tx.description || tx.type}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {tx.occurred_on} · {accountName} · {tx.type}
                    </p>
                  </div>
                  <Mxn cents={tx.amount_cents} className="tabular-nums" />
                </li>
              );
            })}
          </ul>
        </Panel>
      </div>
    </div>
  );
}
