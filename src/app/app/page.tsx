import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { availableCreditCents } from "@/lib/credit-cycle";
import {
  Mxn,
  PageHeader,
  Panel,
  accountTypeLabel,
  btnPrimary,
} from "@/components/ui";
import { dismissReminder } from "@/app/actions/subscriptions";
import { SubmitButton } from "@/components/submit-button";
import { btnGhost } from "@/components/ui";

export default async function DashboardPage() {
  const { supabase, user } = await requireUser();

  const [
    { data: accounts },
    { data: profiles },
    { data: openPeriods },
    { data: subscriptions },
    { data: reminders },
  ] = await Promise.all([
    supabase
      .from("accounts")
      .select("*")
      .eq("is_archived", false)
      .order("created_at"),
    supabase.from("credit_card_profiles").select("*"),
    supabase
      .from("statement_periods")
      .select("*")
      .eq("status", "open")
      .order("closes_on"),
    supabase
      .from("subscriptions")
      .select("*, accounts(name)")
      .eq("is_active", true)
      .order("next_billing_on")
      .limit(8),
    supabase
      .from("reminders")
      .select("*")
      .eq("status", "pending")
      .eq("channel", "in_app")
      .order("due_on")
      .limit(10),
  ]);

  const profileByAccount = new Map(
    (profiles ?? []).map((p) => [p.account_id, p]),
  );
  const periodByAccount = new Map(
    (openPeriods ?? []).map((p) => [p.account_id, p]),
  );

  const liquid = (accounts ?? []).filter((a) => a.type !== "credit_card");
  const cards = (accounts ?? []).filter((a) => a.type === "credit_card");

  return (
    <div>
      <PageHeader
        title="Inicio"
        subtitle={`Hola${user.email ? `, ${user.email}` : ""}. Tu panorama de crédito y liquidez.`}
        action={
          <Link href="/app/accounts/new" className={btnPrimary}>
            Nueva cuenta
          </Link>
        }
      />

      {(reminders ?? []).length > 0 ? (
        <Panel className="mb-6 border-[var(--accent)]/30 bg-[var(--accent-soft)]">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--accent-deep)]">
            Recordatorios
          </h2>
          <ul className="mt-3 space-y-3">
            {(reminders ?? []).map((r) => (
              <li
                key={r.id}
                className="flex flex-wrap items-start justify-between gap-3 border-b border-[var(--line)]/60 pb-3 last:border-0 last:pb-0"
              >
                <div>
                  <p className="font-medium text-[var(--ink)]">{r.title}</p>
                  <p className="text-sm text-[var(--muted)]">{r.body}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">
                    Para el {r.due_on}
                  </p>
                </div>
                <form
                  action={async () => {
                    "use server";
                    await dismissReminder(r.id);
                  }}
                >
                  <SubmitButton className={btnGhost}>Listo</SubmitButton>
                </form>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <Panel>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
            Liquidez
          </h2>
          <ul className="mt-3 space-y-3">
            {liquid.length === 0 ? (
              <li className="text-sm text-[var(--muted)]">
                Sin cuentas de efectivo/débito.{" "}
                <Link className="underline" href="/app/accounts/new">
                  Agrega una
                </Link>
              </li>
            ) : (
              liquid.map((a) => (
                <li key={a.id} className="flex justify-between gap-2">
                  <Link
                    href={`/app/accounts/${a.id}`}
                    className="font-medium text-[var(--ink)] hover:underline"
                  >
                    {a.name}
                    <span className="ml-2 text-xs font-normal text-[var(--muted)]">
                      {accountTypeLabel(a.type)}
                    </span>
                  </Link>
                  <Mxn cents={a.balance_cents} className="tabular-nums" />
                </li>
              ))
            )}
          </ul>
        </Panel>

        <Panel>
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
            Tarjetas de crédito
          </h2>
          <ul className="mt-3 space-y-4">
            {cards.length === 0 ? (
              <li className="text-sm text-[var(--muted)]">
                Sin TDC.{" "}
                <Link className="underline" href="/app/accounts/new">
                  Agrega tu primera tarjeta
                </Link>
              </li>
            ) : (
              cards.map((a) => {
                const profile = profileByAccount.get(a.id);
                const period = periodByAccount.get(a.id);
                const available = profile
                  ? availableCreditCents(
                      profile.credit_limit_cents,
                      a.balance_cents,
                    )
                  : 0;
                return (
                  <li key={a.id} className="rounded-xl bg-[var(--wash)] p-3">
                    <div className="flex justify-between gap-2">
                      <Link
                        href={`/app/accounts/${a.id}`}
                        className="font-medium hover:underline"
                      >
                        {a.name}
                      </Link>
                      <span className="text-sm text-[var(--muted)]">
                        Debes <Mxn cents={a.balance_cents} />
                      </span>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-[var(--muted)]">
                      <span>
                        Disponible: <Mxn cents={available} />
                      </span>
                      <span>
                        Límite:{" "}
                        <Mxn cents={profile?.credit_limit_cents ?? 0} />
                      </span>
                      <span>Corte: {period?.closes_on ?? "—"}</span>
                      <span>Pago: {period?.due_on ?? "—"}</span>
                    </div>
                  </li>
                );
              })
            )}
          </ul>
        </Panel>
      </div>

      <Panel className="mt-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-[var(--muted)]">
            Próximas suscripciones
          </h2>
          <Link href="/app/subscriptions" className="text-sm underline">
            Ver todas
          </Link>
        </div>
        <ul className="mt-3 divide-y divide-[var(--line)]">
          {(subscriptions ?? []).length === 0 ? (
            <li className="py-2 text-sm text-[var(--muted)]">
              Ninguna activa.{" "}
              <Link href="/app/subscriptions" className="underline">
                Registra Netflix u otra
              </Link>
            </li>
          ) : (
            (subscriptions ?? []).map((s) => {
              const accountName =
                s.accounts &&
                typeof s.accounts === "object" &&
                "name" in s.accounts
                  ? String((s.accounts as { name: string }).name)
                  : "—";
              return (
                <li
                  key={s.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-3"
                >
                  <div>
                    <p className="font-medium">{s.name}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {s.merchant} · {accountName} · {s.next_billing_on}
                    </p>
                  </div>
                  <Mxn cents={s.amount_cents} className="tabular-nums" />
                </li>
              );
            })
          )}
        </ul>
      </Panel>
    </div>
  );
}
