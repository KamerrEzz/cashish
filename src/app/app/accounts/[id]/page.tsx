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
import { EmptyState, MoneyTone, SectionTitle } from "@/components/empty-state";
import { UtilizationBar } from "@/components/dashboard/credit-ui";
import { SubmitButton } from "@/components/submit-button";
import {
  closeStatementPeriod,
  markStatementPaid,
  createLinkedTransfer,
} from "@/app/actions/transfers";

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
  const isCard = account.type === "credit_card" && profile;
  const available = isCard
    ? availableCreditCents(profile.credit_limit_cents, account.balance_cents)
    : 0;

  return (
    <div className="dash-enter space-y-6">
      <PageHeader
        title={account.name}
        subtitle={accountTypeLabel(account.type)}
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/app/accounts" className={btnGhost}>
              Todas
            </Link>
            <Link href="/app/transactions" className={btnPrimary}>
              Movimiento
            </Link>
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          {isCard ? (
            <>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-[var(--muted)]">Debes</p>
                  <p className="mt-1 font-[family-name:var(--font-display)] text-3xl tracking-tight tabular-nums">
                    <Mxn cents={account.balance_cents} />
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-[var(--muted)]">Disponible</p>
                  <p
                    className={`mt-1 font-[family-name:var(--font-display)] text-2xl tabular-nums ${
                      available < 0 ? "text-[var(--danger-ink)]" : ""
                    }`}
                  >
                    <Mxn cents={available} />
                  </p>
                </div>
              </div>
              <UtilizationBar
                owedCents={account.balance_cents}
                limitCents={profile.credit_limit_cents}
              />
              <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-[var(--line)] pt-4 text-sm">
                <div>
                  <dt className="text-xs text-[var(--muted)]">Límite</dt>
                  <dd className="mt-0.5 font-medium">
                    <Mxn cents={profile.credit_limit_cents} />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--muted)]">Pago mínimo</dt>
                  <dd className="mt-0.5 font-medium">
                    <Mxn cents={profile.minimum_payment_cents} />
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--muted)]">Próximo corte</dt>
                  <dd className="mt-0.5 font-medium">
                    {openPeriod?.closes_on ?? "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs text-[var(--muted)]">Límite de pago</dt>
                  <dd className="mt-0.5 font-medium">
                    {openPeriod?.due_on ?? "—"}
                  </dd>
                </div>
              </dl>
            </>
          ) : (
            <div>
              <p className="text-xs text-[var(--muted)]">Saldo disponible</p>
              <p className="mt-1 font-[family-name:var(--font-display)] text-3xl tracking-tight tabular-nums">
                <Mxn cents={account.balance_cents} />
              </p>
              <p className="mt-3 text-sm text-[var(--muted)]">
                Cuenta líquida para gastos, transferencias y pagos de tarjeta.
              </p>
            </div>
          )}
        </Panel>

        {isCard ? (
          <Panel>
            <SectionTitle
              title="Pagar tarjeta"
              subtitle="Transferencia vinculada: baja el débito y reduce la deuda"
            />
            <form
              action={async (formData) => {
                "use server";
                await createLinkedTransfer(formData);
              }}
              className="space-y-3"
            >
              <input type="hidden" name="toAccountId" value={account.id} />
              <input type="hidden" name="occurredOn" value={todayMexico()} />
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
        ) : (
          <Panel>
            <SectionTitle
              title="Acciones"
              subtitle="Sigue el dinero desde esta cuenta"
            />
            <div className="flex flex-wrap gap-2">
              <Link href="/app/transactions" className={btnPrimary}>
                Registrar movimiento
              </Link>
              <Link href="/app/analytics" className={btnGhost}>
                Ver analíticas
              </Link>
            </div>
          </Panel>
        )}
      </div>

      {isCard && openPeriod ? (
        <Panel>
          <SectionTitle
            title="Cerrar corte"
            subtitle={`Congela ${openPeriod.opens_on} → ${openPeriod.closes_on} y abre el siguiente ciclo`}
          />
          <form
            action={async (formData) => {
              "use server";
              await closeStatementPeriod(formData);
            }}
            className="flex flex-wrap items-end gap-3"
          >
            <input type="hidden" name="accountId" value={account.id} />
            <Field label="Pago mínimo del estado (opcional)">
              <input
                name="minimumPayment"
                className={inputClass}
                placeholder="0.00"
              />
            </Field>
            <SubmitButton>Cerrar periodo</SubmitButton>
          </form>
        </Panel>
      ) : null}

      {closedUnpaid.length > 0 ? (
        <Panel>
          <SectionTitle
            title="Estados cerrados"
            subtitle="Marca como pagado cuando saldes el corte"
          />
          <ul className="space-y-3">
            {closedUnpaid.map((p) => (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--line)] pb-3 text-sm last:border-0 last:pb-0"
              >
                <span>
                  Corte {p.closes_on} · pago {p.due_on} ·{" "}
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

      <Panel>
        <SectionTitle title="Movimientos recientes" />
        {(txs ?? []).length === 0 ? (
          <EmptyState
            title="Sin movimientos"
            body="Los cargos e ingresos de esta cuenta aparecerán aquí."
            actionHref="/app/transactions"
            actionLabel="Registrar"
          />
        ) : (
          <ul className="divide-y divide-[var(--line)]">
            {(txs ?? []).map((tx) => (
              <li
                key={tx.id}
                className="flex justify-between gap-2 py-3 text-sm"
              >
                <div>
                  <p className="font-medium">
                    {tx.merchant || tx.description || tx.type}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    {tx.occurred_on} · {tx.type}
                  </p>
                </div>
                <MoneyTone cents={tx.amount_cents} type={tx.type} />
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}
