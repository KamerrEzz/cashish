import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { availableCreditCents, todayMexico } from "@/lib/credit-cycle";
import {
  Mxn,
  PageHeader,
  Panel,
  accountTypeLabel,
  btnGhost,
  btnPrimary,
  Field,
  inputClass,
} from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { closeStatementPeriod, markStatementPaid } from "@/app/actions/transfers";
import { createLinkedTransfer } from "@/app/actions/transfers";

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase } = await requireUser();

  const { data: account } = await supabase
    .from("accounts")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!account) notFound();

  const [{ data: profile }, { data: periods }, { data: txs }, { data: sources }] =
    await Promise.all([
      account.type === "credit_card"
        ? supabase
            .from("credit_card_profiles")
            .select("*")
            .eq("account_id", id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      supabase
        .from("statement_periods")
        .select("*")
        .eq("account_id", id)
        .order("closes_on", { ascending: false })
        .limit(6),
      supabase
        .from("transactions")
        .select("*")
        .eq("account_id", id)
        .order("occurred_on", { ascending: false })
        .limit(20),
      supabase
        .from("accounts")
        .select("id, name, type")
        .eq("is_archived", false)
        .neq("type", "credit_card")
        .order("name"),
    ]);

  const openPeriod = (periods ?? []).find((p) => p.status === "open");
  const closedUnpaid = (periods ?? []).filter((p) => p.status === "closed");

  return (
    <div>
      <PageHeader
        title={account.name}
        subtitle={accountTypeLabel(account.type)}
        action={
          <Link href="/app/transactions" className={btnPrimary}>
            Nuevo movimiento
          </Link>
        }
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Panel>
          {account.type === "credit_card" && profile ? (
            <dl className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <dt className="text-[var(--muted)]">Debes</dt>
                <dd className="text-xl font-semibold">
                  <Mxn cents={account.balance_cents} />
                </dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">Disponible</dt>
                <dd className="text-xl font-semibold">
                  <Mxn
                    cents={availableCreditCents(
                      profile.credit_limit_cents,
                      account.balance_cents,
                    )}
                  />
                </dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">Límite</dt>
                <dd>
                  <Mxn cents={profile.credit_limit_cents} />
                </dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">Pago mínimo</dt>
                <dd>
                  <Mxn cents={profile.minimum_payment_cents} />
                </dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">Próximo corte</dt>
                <dd>{openPeriod?.closes_on ?? "—"}</dd>
              </div>
              <div>
                <dt className="text-[var(--muted)]">Fecha límite de pago</dt>
                <dd>{openPeriod?.due_on ?? "—"}</dd>
              </div>
            </dl>
          ) : (
            <div>
              <p className="text-sm text-[var(--muted)]">Saldo</p>
              <p className="text-2xl font-semibold">
                <Mxn cents={account.balance_cents} />
              </p>
            </div>
          )}
        </Panel>

        {account.type === "credit_card" ? (
          <Panel>
            <h2 className="font-semibold">Pagar tarjeta</h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Transferencia vinculada: baja tu débito y reduce la deuda.
            </p>
            <form
              action={async (formData) => {
                "use server";
                await createLinkedTransfer(formData);
              }}
              className="mt-4 space-y-3"
            >
              <input type="hidden" name="toAccountId" value={account.id} />
              <input
                type="hidden"
                name="occurredOn"
                value={todayMexico()}
              />
              <Field label="Desde">
                <select name="fromAccountId" required className={inputClass}>
                  {(sources ?? []).map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Monto">
                <input
                  name="amount"
                  required
                  className={inputClass}
                  placeholder="0.00"
                />
              </Field>
              <Field label="Nota">
                <input
                  name="note"
                  className={inputClass}
                  placeholder="Pago TDC"
                  defaultValue="Pago tarjeta"
                />
              </Field>
              <SubmitButton>Registrar pago</SubmitButton>
            </form>
          </Panel>
        ) : null}
      </div>

      {account.type === "credit_card" && openPeriod ? (
        <Panel className="mt-4">
          <h2 className="font-semibold">Cerrar corte</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">
            Congela el periodo {openPeriod.opens_on} → {openPeriod.closes_on} y
            abre el siguiente ciclo.
          </p>
          <form
            action={async (formData) => {
              "use server";
              await closeStatementPeriod(formData);
            }}
            className="mt-4 flex flex-wrap items-end gap-3"
          >
            <input type="hidden" name="accountId" value={account.id} />
            <Field label="Pago mínimo del estado (opcional)">
              <input name="minimumPayment" className={inputClass} placeholder="0.00" />
            </Field>
            <SubmitButton>Cerrar periodo</SubmitButton>
          </form>
        </Panel>
      ) : null}

      {closedUnpaid.length > 0 ? (
        <Panel className="mt-4">
          <h2 className="font-semibold">Estados cerrados</h2>
          <ul className="mt-3 space-y-2">
            {closedUnpaid.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 text-sm"
              >
                <span>
                  Corte {p.closes_on} · pago límite {p.due_on} · saldo{" "}
                  <Mxn cents={p.closing_balance_cents ?? 0} />
                </span>
                <form
                  action={async () => {
                    "use server";
                    await markStatementPaid(p.id, account.id);
                  }}
                >
                  <SubmitButton className={btnGhost}>Marcar pagado</SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <Panel className="mt-4">
        <h2 className="font-semibold">Movimientos recientes</h2>
        <ul className="mt-3 divide-y divide-[var(--line)]">
          {(txs ?? []).length === 0 ? (
            <li className="py-2 text-sm text-[var(--muted)]">Sin movimientos.</li>
          ) : (
            (txs ?? []).map((tx) => (
              <li
                key={tx.id}
                className="flex justify-between gap-2 py-2 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {tx.merchant || tx.description || tx.type}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    {tx.occurred_on} · {tx.type}
                  </p>
                </div>
                <Mxn cents={tx.amount_cents} className="tabular-nums" />
              </li>
            ))
          )}
        </ul>
      </Panel>
    </div>
  );
}
