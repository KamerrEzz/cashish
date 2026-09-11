import Link from "next/link";
import { requireProject } from "@/lib/projects";
import {
  Mxn,
  PageHeader,
  Panel,
  accountTypeLabel,
  btnPrimary,
} from "@/components/ui";
import { availableCreditCents } from "@/lib/credit-cycle";
import { UtilizationBar } from "@/components/dashboard/credit-ui";

export default async function AccountsPage() {
  const { supabase, project } = await requireProject();
  const [{ data: accounts }, { data: periods }] = await Promise.all([
    supabase
      .from("accounts")
      .select("*, credit_card_profiles(*)")
      .eq("project_id", project.id)
      .eq("is_archived", false)
      .order("created_at"),
    supabase
      .from("statement_periods")
      .select("account_id, closes_on, due_on, minimum_payment_cents")
      .eq("project_id", project.id)
      .eq("status", "open"),
  ]);

  const periodByAccount = new Map(
    (periods ?? []).map((p) => [p.account_id, p]),
  );

  const liquid = (accounts ?? []).filter((a) => a.type !== "credit_card");
  const cards = (accounts ?? []).filter((a) => a.type === "credit_card");

  return (
    <div className="space-y-8">
      <PageHeader
        title="Cuentas"
        subtitle="Liquidez por un lado; crédito con corte, pago y límite por el otro."
        action={
          <Link href="/app/accounts/new" className={btnPrimary}>
            Nueva cuenta
          </Link>
        }
      />

      <section>
        <h2 className="font-[family-name:var(--font-display)] text-lg text-[var(--ink)]">
          Liquidez
        </h2>
        <ul className="mt-3 grid gap-3">
          {liquid.length === 0 ? (
            <Panel>
              <p className="text-sm text-[var(--muted)]">
                Sin efectivo ni débito.{" "}
                <Link href="/app/accounts/new" className="underline underline-offset-2">
                  Agrega una cuenta
                </Link>
              </p>
            </Panel>
          ) : (
            liquid.map((account) => (
              <Link key={account.id} href={`/app/accounts/${account.id}`}>
                <Panel className="transition hover:border-[var(--accent)]/40">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="font-semibold text-[var(--ink)]">{account.name}</p>
                      <p className="text-sm text-[var(--muted)]">
                        {accountTypeLabel(account.type)}
                      </p>
                    </div>
                    <Mxn
                      cents={account.balance_cents}
                      className="font-[family-name:var(--font-display)] text-xl tabular-nums tracking-tight"
                    />
                  </div>
                </Panel>
              </Link>
            ))
          )}
        </ul>
      </section>

      <section>
        <h2 className="font-[family-name:var(--font-display)] text-lg text-[var(--ink)]">
          Tarjetas de crédito
        </h2>
        <ul className="mt-3 grid gap-3 md:grid-cols-2">
          {cards.length === 0 ? (
            <Panel className="md:col-span-2">
              <p className="text-sm text-[var(--muted)]">
                Sin TDC.{" "}
                <Link href="/app/accounts/new" className="underline underline-offset-2">
                  Crea una con límite, corte y pago
                </Link>
              </p>
            </Panel>
          ) : (
            cards.map((account) => {
              const profile = Array.isArray(account.credit_card_profiles)
                ? account.credit_card_profiles[0]
                : account.credit_card_profiles;
              const period = periodByAccount.get(account.id);
              const available = profile
                ? availableCreditCents(
                    profile.credit_limit_cents,
                    account.balance_cents,
                  )
                : 0;

              return (
                <li key={account.id}>
                  <Link href={`/app/accounts/${account.id}`}>
                    <Panel className="h-full transition hover:border-[var(--accent)]/40">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-[var(--ink)]">
                            {account.name}
                          </p>
                          <p className="text-xs text-[var(--muted)]">
                            {period
                              ? `Corte ${period.closes_on} · Pago ${period.due_on}`
                              : "Sin ciclo abierto"}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-[var(--muted)]">Debes</p>
                          <Mxn
                            cents={account.balance_cents}
                            className="font-[family-name:var(--font-display)] text-lg tabular-nums"
                          />
                        </div>
                      </div>
                      {profile ? (
                        <UtilizationBar
                          owedCents={account.balance_cents}
                          limitCents={profile.credit_limit_cents}
                        />
                      ) : null}
                      <p className="mt-3 text-xs text-[var(--muted)]">
                        Disponible{" "}
                        <Mxn
                          cents={available}
                          className={
                            available < 0
                              ? "font-medium text-[var(--danger-ink)]"
                              : "font-medium text-[var(--ink)]"
                          }
                        />
                        {profile ? (
                          <>
                            {" "}
                            de <Mxn cents={profile.credit_limit_cents} />
                          </>
                        ) : null}
                      </p>
                    </Panel>
                  </Link>
                </li>
              );
            })
          )}
        </ul>
      </section>
    </div>
  );
}
