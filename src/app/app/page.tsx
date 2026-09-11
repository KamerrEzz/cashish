import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { availableCreditCents, todayMexico } from "@/lib/credit-cycle";
import { todayLabelMx, daysBetween, relativeDayLabel } from "@/lib/dates";
import {
  Mxn,
  Panel,
  accountTypeLabel,
  btnPrimary,
  btnGhost,
} from "@/components/ui";
import { dismissReminder } from "@/app/actions/subscriptions";
import { SubmitButton } from "@/components/submit-button";
import {
  CreditAgenda,
  StatCell,
  SummaryCell,
  SummaryStrip,
  UtilizationBar,
  urgencyFromDays,
  type AgendaItem,
} from "@/components/dashboard/credit-ui";

function firstName(fullName: string | null | undefined, email: string | undefined) {
  if (fullName?.trim()) return fullName.trim().split(/\s+/)[0];
  if (!email) return null;
  const local = email.split("@")[0] ?? "";
  const cleaned = local.replace(/[._+-]+/g, " ").trim();
  if (!cleaned) return null;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

export default async function DashboardPage() {
  const { supabase, user } = await requireUser();
  const today = todayMexico();

  const [
    { data: profile },
    { data: accounts },
    { data: profiles },
    { data: openPeriods },
    { data: subscriptions },
    { data: reminders },
  ] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
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
      .limit(6),
    supabase
      .from("reminders")
      .select("*")
      .eq("status", "pending")
      .eq("channel", "in_app")
      .order("due_on")
      .limit(8),
  ]);

  const profileByAccount = new Map(
    (profiles ?? []).map((p) => [p.account_id, p]),
  );
  const periodByAccount = new Map(
    (openPeriods ?? []).map((p) => [p.account_id, p]),
  );

  const liquid = (accounts ?? []).filter((a) => a.type !== "credit_card");
  const cards = (accounts ?? []).filter((a) => a.type === "credit_card");

  const liquidTotal = liquid.reduce((s, a) => s + a.balance_cents, 0);
  const debtTotal = cards.reduce((s, a) => s + a.balance_cents, 0);
  const minDueTotal = cards.reduce((s, a) => {
    const period = periodByAccount.get(a.id);
    const profile = profileByAccount.get(a.id);
    return s + (period?.minimum_payment_cents || profile?.minimum_payment_cents || 0);
  }, 0);

  const coverageOk =
    minDueTotal === 0 ? true : liquidTotal >= minDueTotal;
  const netWorth = liquidTotal - debtTotal;
  const subMonthly = (subscriptions ?? []).reduce((s, sub) => {
    if (sub.frequency === "yearly") return s + Math.round(sub.amount_cents / 12);
    if (sub.frequency === "weekly") return s + Math.round(sub.amount_cents * 4.33);
    return s + sub.amount_cents;
  }, 0);

  const agenda: AgendaItem[] = [];
  for (const a of cards) {
    const period = periodByAccount.get(a.id);
    if (!period) continue;
    agenda.push({
      id: `${period.id}-corte`,
      kind: "corte",
      accountId: a.id,
      accountName: a.name,
      date: period.closes_on,
    });
    agenda.push({
      id: `${period.id}-pago`,
      kind: "pago",
      accountId: a.id,
      accountName: a.name,
      date: period.due_on,
      amountCents:
        period.minimum_payment_cents ||
        profileByAccount.get(a.id)?.minimum_payment_cents ||
        undefined,
      amountLabel: "pago mínimo",
    });
  }
  agenda.sort((a, b) => a.date.localeCompare(b.date) || a.kind.localeCompare(b.kind));
  const agendaSoon = agenda.filter((e) => daysBetween(today, e.date) <= 45).slice(0, 8);

  const nextEvent =
    agendaSoon.find((e) => daysBetween(today, e.date) >= 0) ?? agendaSoon[0];
  const greeting = firstName(profile?.full_name, user.email ?? undefined);
  const dateLabel = todayLabelMx(today);

  const cardsSorted = [...cards].sort((a, b) => {
    const pa = periodByAccount.get(a.id);
    const pb = periodByAccount.get(b.id);
    const da = pa ? daysBetween(today, pa.due_on) : 999;
    const db = pb ? daysBetween(today, pb.due_on) : 999;
    return da - db;
  });

  return (
    <div className="dash-enter space-y-6 sm:space-y-8">
      <header className="flex flex-col gap-4 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm capitalize text-[var(--muted)]">{dateLabel}</p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-[clamp(1.75rem,5vw,2.25rem)] tracking-tight text-[var(--ink)]">
            {greeting ? `Hola, ${greeting}` : "Tu panorama"}
          </h1>
          <p className="mt-2 max-w-lg text-sm leading-relaxed text-[var(--muted)]">
            {nextEvent
              ? `Lo siguiente: ${nextEvent.kind === "corte" ? "corte" : "pago"} de ${nextEvent.accountName} · ${relativeDayLabel(daysBetween(today, nextEvent.date)).toLowerCase()}.`
              : "Liquidez, crédito, suscripciones y flujo — tu sistema personal."}
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          <Link href="/app/analytics" className={btnGhost}>
            Analíticas
          </Link>
          <Link href="/app/transactions" className={btnGhost}>
            Movimiento
          </Link>
          <Link href="/app/accounts/new" className={btnPrimary}>
            Nueva cuenta
          </Link>
        </div>
      </header>

      {(reminders ?? []).length > 0 ? (
        <Panel className="border-[var(--warn)]/25 bg-[var(--warn-soft)]">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <h2 className="font-[family-name:var(--font-display)] text-lg text-[var(--ink)]">
              Pendientes
            </h2>
            <Link
              href="/app/reminders"
              className="text-xs text-[var(--muted)] underline-offset-2 hover:underline"
            >
              Ver todos
            </Link>
          </div>
          <ul className="mt-4 space-y-3">
            {(reminders ?? []).map((r) => (
              <li
                key={r.id}
                className="flex flex-col gap-3 border-b border-[var(--line)]/70 pb-3 last:border-0 last:pb-0 sm:flex-row sm:items-start sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="font-medium text-[var(--ink)]">{r.title}</p>
                  <p className="mt-0.5 text-sm text-[var(--muted)]">{r.body}</p>
                  <p className="mt-1 text-xs text-[var(--muted)]">Para el {r.due_on}</p>
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

      <SummaryStrip>
        <SummaryCell>
          <StatCell label="Patrimonio neto" hint="Liquidez − deuda TDC">
            <span className={netWorth < 0 ? "text-[var(--danger-ink)]" : undefined}>
              {netWorth < 0 ? "−" : null}
              <Mxn cents={Math.abs(netWorth)} />
            </span>
          </StatCell>
        </SummaryCell>
        <SummaryCell>
          <StatCell label="Liquidez" hint={`${liquid.length} cuenta${liquid.length === 1 ? "" : "s"}`}>
            <Mxn cents={liquidTotal} />
          </StatCell>
        </SummaryCell>
        <SummaryCell>
          <StatCell label="Deuda TDC" hint={`${cards.length} tarjeta${cards.length === 1 ? "" : "s"}`}>
            <Mxn cents={debtTotal} />
          </StatCell>
        </SummaryCell>
        <SummaryCell>
          <StatCell
            label={minDueTotal > 0 ? "Pagos mínimos" : "Suscripciones / mes"}
            hint={
              minDueTotal > 0
                ? coverageOk
                  ? "Cubiertos con tu liquidez"
                  : "Tu liquidez no alcanza"
                : `${(subscriptions ?? []).length} activas`
            }
          >
            <span
              className={
                minDueTotal > 0 && !coverageOk
                  ? "text-[var(--warn-ink)]"
                  : undefined
              }
            >
              <Mxn cents={minDueTotal > 0 ? minDueTotal : subMonthly} />
            </span>
          </StatCell>
        </SummaryCell>
      </SummaryStrip>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
        <Panel>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-[family-name:var(--font-display)] text-lg text-[var(--ink)] sm:text-xl">
                Calendario de crédito
              </h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Cortes y fechas límite de tus ciclos abiertos
              </p>
            </div>
            <Link
              href="/app/accounts"
              className="shrink-0 text-xs text-[var(--muted)] underline-offset-2 hover:underline"
            >
              Cuentas
            </Link>
          </div>
          <div className="mt-5 sm:mt-6">
            <CreditAgenda items={agendaSoon} today={today} />
          </div>
        </Panel>

        <Panel>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <h2 className="font-[family-name:var(--font-display)] text-lg text-[var(--ink)] sm:text-xl">
                Liquidez
              </h2>
              <p className="mt-1 text-sm text-[var(--muted)]">
                Efectivo y cuentas de débito
              </p>
            </div>
            <Link
              href="/app/accounts/new"
              className="shrink-0 text-xs text-[var(--muted)] underline-offset-2 hover:underline"
            >
              Agregar
            </Link>
          </div>
          <ul className="mt-5 divide-y divide-[var(--line)]">
            {liquid.length === 0 ? (
              <li className="py-3 text-sm text-[var(--muted)]">
                Sin cuentas líquidas.{" "}
                <Link className="underline underline-offset-2" href="/app/accounts/new">
                  Agrega una
                </Link>
              </li>
            ) : (
              liquid.map((a) => (
                <li key={a.id} className="flex items-start justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <Link
                      href={`/app/accounts/${a.id}`}
                      className="block truncate font-medium text-[var(--ink)] hover:underline"
                    >
                      {a.name}
                    </Link>
                    <p className="text-xs text-[var(--muted)]">
                      {accountTypeLabel(a.type)}
                    </p>
                  </div>
                  <Mxn
                    cents={a.balance_cents}
                    className="shrink-0 tabular-nums font-medium"
                  />
                </li>
              ))
            )}
          </ul>
          {liquid.length > 0 ? (
            <div className="mt-2 flex justify-between gap-3 border-t border-[var(--line)] pt-3 text-sm">
              <span className="text-[var(--muted)]">Total</span>
              <Mxn cents={liquidTotal} className="shrink-0 font-semibold tabular-nums" />
            </div>
          ) : null}
        </Panel>
      </div>

      <section aria-labelledby="tdc-heading">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <div className="min-w-0">
            <h2
              id="tdc-heading"
              className="font-[family-name:var(--font-display)] text-lg text-[var(--ink)] sm:text-xl"
            >
              Tarjetas de crédito
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Deuda, disponible y cercanía al pago — no saldos “como débito”
            </p>
          </div>
          <Link
            href="/app/accounts"
            className="text-xs text-[var(--muted)] underline-offset-2 hover:underline"
          >
            Ver todas
          </Link>
        </div>

        {cardsSorted.length === 0 ? (
          <Panel>
            <p className="text-sm text-[var(--muted)]">
              Aún no tienes TDC.{" "}
              <Link href="/app/accounts/new" className="underline underline-offset-2">
                Agrega tu primera tarjeta
              </Link>{" "}
              con límite, día de corte y día de pago.
            </p>
          </Panel>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:gap-4 md:grid-cols-2">
            {cardsSorted.map((a) => {
              const cc = profileByAccount.get(a.id);
              const period = periodByAccount.get(a.id);
              const available = cc
                ? availableCreditCents(cc.credit_limit_cents, a.balance_cents)
                : 0;
              const dueDays = period ? daysBetween(today, period.due_on) : null;
              const closeDays = period ? daysBetween(today, period.closes_on) : null;
              const dueUrgency =
                dueDays != null ? urgencyFromDays(dueDays) : "calm";
              const over = cc ? a.balance_cents > cc.credit_limit_cents : false;

              return (
                <li key={a.id} className="min-w-0">
                  <Link
                    href={`/app/accounts/${a.id}`}
                    className="block h-full rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[0_1px_0_rgba(20,40,30,0.04)] transition-[border-color,box-shadow] hover:border-[var(--accent)]/35 hover:shadow-[0_8px_24px_rgba(15,61,42,0.06)] sm:p-5"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-[var(--ink)]">
                          {a.name}
                        </p>
                        {over ? (
                          <p className="mt-1 text-xs font-medium text-[var(--danger-ink)]">
                            Sobre el límite de crédito
                          </p>
                        ) : dueDays != null && dueDays <= 7 ? (
                          <p
                            className={`mt-1 text-xs font-medium ${
                              dueUrgency === "calm"
                                ? "text-[var(--muted)]"
                                : dueUrgency === "soon"
                                  ? "text-[var(--warn-ink)]"
                                  : "text-[var(--danger-ink)]"
                            }`}
                          >
                            Pago{" "}
                            {dueDays < 0
                              ? "vencido"
                              : dueDays === 0
                                ? "hoy"
                                : `en ${dueDays} días`}
                          </p>
                        ) : (
                          <p className="mt-1 text-xs text-[var(--muted)]">
                            Ciclo abierto
                          </p>
                        )}
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs text-[var(--muted)]">Debes</p>
                        <p className="font-[family-name:var(--font-display)] text-lg tabular-nums tracking-tight sm:text-xl">
                          <Mxn cents={a.balance_cents} />
                        </p>
                      </div>
                    </div>

                    {cc ? (
                      <UtilizationBar
                        owedCents={a.balance_cents}
                        limitCents={cc.credit_limit_cents}
                      />
                    ) : null}

                    <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3 text-xs">
                      <div className="min-w-0">
                        <dt className="text-[var(--muted)]">Disponible</dt>
                        <dd
                          className={`mt-0.5 break-words tabular-nums font-medium ${
                            available < 0
                              ? "text-[var(--danger-ink)]"
                              : "text-[var(--ink)]"
                          }`}
                        >
                          <Mxn cents={available} />
                        </dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-[var(--muted)]">Límite</dt>
                        <dd className="mt-0.5 break-words tabular-nums font-medium text-[var(--ink)]">
                          <Mxn cents={cc?.credit_limit_cents ?? 0} />
                        </dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-[var(--muted)]">Corte</dt>
                        <dd className="mt-0.5 font-medium text-[var(--ink)]">
                          {period?.closes_on ?? "—"}
                          {closeDays != null && closeDays <= 14 ? (
                            <span className="ml-1 font-normal text-[var(--muted)]">
                              ({closeDays <= 0 ? "hoy" : `${closeDays}d`})
                            </span>
                          ) : null}
                        </dd>
                      </div>
                      <div className="min-w-0">
                        <dt className="text-[var(--muted)]">Pago</dt>
                        <dd className="mt-0.5 font-medium text-[var(--ink)]">
                          {period?.due_on ?? "—"}
                          {dueDays != null && dueDays <= 14 ? (
                            <span className="ml-1 font-normal text-[var(--muted)]">
                              ({dueDays <= 0 ? "hoy" : `${dueDays}d`})
                            </span>
                          ) : null}
                        </dd>
                      </div>
                    </dl>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <Panel>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="font-[family-name:var(--font-display)] text-lg text-[var(--ink)] sm:text-xl">
              Suscripciones
            </h2>
            <p className="mt-1 text-sm text-[var(--muted)]">
              Cargos recurrentes que no deberían sorprenderte
            </p>
          </div>
          <Link
            href="/app/subscriptions"
            className="text-xs text-[var(--muted)] underline-offset-2 hover:underline"
          >
            Administrar
          </Link>
        </div>
        <ul className="mt-5 divide-y divide-[var(--line)]">
          {(subscriptions ?? []).length === 0 ? (
            <li className="py-3 text-sm text-[var(--muted)]">
              Ninguna activa.{" "}
              <Link href="/app/subscriptions" className="underline underline-offset-2">
                Registra la primera
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
                  className="flex items-start justify-between gap-3 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-[var(--ink)]">{s.name}</p>
                    <p className="text-xs text-[var(--muted)]">
                      {s.merchant} · {accountName} · próximo {s.next_billing_on}
                    </p>
                  </div>
                  <Mxn
                    cents={s.amount_cents}
                    className="shrink-0 tabular-nums font-medium"
                  />
                </li>
              );
            })
          )}
        </ul>
      </Panel>
    </div>
  );
}
