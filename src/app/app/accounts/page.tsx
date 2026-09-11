import Link from "next/link";
import { requireUser } from "@/lib/auth";
import {
  Mxn,
  PageHeader,
  Panel,
  accountTypeLabel,
  btnPrimary,
} from "@/components/ui";
import { availableCreditCents } from "@/lib/credit-cycle";

export default async function AccountsPage() {
  const { supabase } = await requireUser();
  const { data: accounts } = await supabase
    .from("accounts")
    .select("*, credit_card_profiles(*)")
    .eq("is_archived", false)
    .order("created_at");

  return (
    <div>
      <PageHeader
        title="Cuentas"
        subtitle="Efectivo, débito, ahorros y tarjetas de crédito con ciclo propio."
        action={
          <Link href="/app/accounts/new" className={btnPrimary}>
            Nueva cuenta
          </Link>
        }
      />
      <div className="grid gap-3">
        {(accounts ?? []).map((account) => {
          const profile = Array.isArray(account.credit_card_profiles)
            ? account.credit_card_profiles[0]
            : account.credit_card_profiles;
          return (
            <Link key={account.id} href={`/app/accounts/${account.id}`}>
              <Panel className="transition hover:border-[var(--accent)]">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-[var(--ink)]">
                      {account.name}
                    </p>
                    <p className="text-sm text-[var(--muted)]">
                      {accountTypeLabel(account.type)}
                    </p>
                  </div>
                  <div className="text-right">
                    {account.type === "credit_card" ? (
                      <>
                        <p className="text-sm text-[var(--muted)]">Debes</p>
                        <Mxn
                          cents={account.balance_cents}
                          className="text-lg font-semibold tabular-nums"
                        />
                        {profile ? (
                          <p className="text-xs text-[var(--muted)]">
                            Disp.{" "}
                            <Mxn
                              cents={availableCreditCents(
                                profile.credit_limit_cents,
                                account.balance_cents,
                              )}
                            />
                          </p>
                        ) : null}
                      </>
                    ) : (
                      <Mxn
                        cents={account.balance_cents}
                        className="text-lg font-semibold tabular-nums"
                      />
                    )}
                  </div>
                </div>
              </Panel>
            </Link>
          );
        })}
        {(accounts ?? []).length === 0 ? (
          <Panel>
            <p className="text-sm text-[var(--muted)]">
              Aún no hay cuentas. Crea un débito y una TDC para empezar.
            </p>
          </Panel>
        ) : null}
      </div>
    </div>
  );
}
