import Link from "next/link";
import { requireProject } from "@/lib/projects";
import { loadQuincenaSnapshot } from "@/lib/quincena";
import { CashflowRunway } from "@/components/cashflow-runway";
import {
  PageHeader,
  Panel,
  Mxn,
  btnPrimary,
  btnGhost,
} from "@/components/ui";
import { formatMxn, money } from "@/lib/money";

export default async function QuincenaPage() {
  const { supabase, project } = await requireProject();
  const snap = await loadQuincenaSnapshot(supabase, project.id, 30);
  const { forecast, primaryPay, window } = snap;
  const ok = forecast.status === "coverage_ok";

  return (
    <div className="space-y-8">
      <PageHeader
        title="Tu quincena"
        subtitle={window.label}
      />

      <section
        className={`rounded-[var(--radius)] border px-5 py-7 sm:px-8 ${
          ok
            ? "border-[var(--line)] bg-[var(--accent-soft)]/50"
            : "border-[var(--warn)]/35 bg-[var(--warn-soft)]/40"
        }`}
      >
        <p className="text-sm text-[var(--muted)]">Veredicto de liquidez</p>
        <h2 className="mt-2 font-[family-name:var(--font-display)] text-3xl font-semibold tracking-tight text-[var(--ink)] md:text-[2.35rem]">
          {ok ? "Te alcanza esta quincena" : "Hay un hueco de liquidez"}
        </h2>
        <p className="mt-3 max-w-xl text-[var(--muted)]">
          {ok
            ? `Tu liquidez proyectada se mantiene en positivo los próximos ${forecast.horizonDays} días.`
            : `Faltante de ${formatMxn(money(forecast.shortfallCents))} desde el ${forecast.firstShortfallOn}.`}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          {primaryPay ? (
            <Link
              href={`/app/accounts/${primaryPay.accountId}?pay=${primaryPay.mode}`}
              className={btnPrimary}
            >
              Pagar {primaryPay.accountName} sin intereses (
              <Mxn cents={primaryPay.avoidInterestCents} />)
            </Link>
          ) : null}
          {!ok ? (
            <a href="#eventos" className={btnGhost}>
              Ver qué lo causa
            </a>
          ) : (
            <Link href="/app/ai" className={btnGhost}>
              Arma mi plan con el asistente
            </Link>
          )}
        </div>
      </section>

      <Panel>
        <h3 className="font-medium text-[var(--ink)]">Runway 30 días</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Liquidez proyectada con ingresos planeados, suscripciones y mínimos TDC.
        </p>
        <div className="mt-4">
          <CashflowRunway forecast={forecast} daily={snap.daily} />
        </div>
      </Panel>

      <div className="grid gap-6 md:grid-cols-2">
        <Panel>
          <h3 className="font-medium text-[var(--ink)]">Cortes próximos</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {snap.upcomingCloses.length === 0 ? (
              <li className="text-[var(--muted)]">Sin cortes en agenda.</li>
            ) : (
              snap.upcomingCloses.map((c) => (
                <li key={c.accountId} className="flex justify-between gap-2">
                  <Link
                    href={`/app/accounts/${c.accountId}`}
                    className="text-[var(--accent-deep)] hover:underline"
                  >
                    {c.accountName}
                  </Link>
                  <span className="text-[var(--muted)]">{c.closesOn}</span>
                </li>
              ))
            )}
          </ul>
        </Panel>
        <Panel>
          <h3 className="font-medium text-[var(--ink)]">Suscripciones</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {snap.upcomingSubs.length === 0 ? (
              <li className="text-[var(--muted)]">Sin cobros próximos.</li>
            ) : (
              snap.upcomingSubs.map((s) => (
                <li key={s.id} className="flex justify-between gap-2">
                  <span>{s.name}</span>
                  <span className="text-[var(--muted)]">
                    <Mxn cents={s.amountCents} /> · {s.nextBillingOn}
                  </span>
                </li>
              ))
            )}
          </ul>
          <Link
            href="/app/subscriptions"
            className="mt-3 inline-block text-sm text-[var(--accent-deep)] hover:underline"
          >
            Gestionar suscripciones
          </Link>
        </Panel>
      </div>

      <Panel id="eventos">
        <h3 className="font-medium text-[var(--ink)]">Eventos del horizonte</h3>
        <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto text-sm">
          {forecast.events.slice(0, 40).map((ev, i) => (
            <li
              key={`${ev.date}-${ev.kind}-${i}`}
              className="flex justify-between gap-3 border-b border-[var(--line)]/60 py-2 last:border-0"
            >
              <span>
                <span className="text-[var(--muted)]">{ev.date}</span>{" "}
                {ev.label}
              </span>
              <span
                className={
                  ev.amountCents < 0
                    ? "text-[var(--danger-ink)]"
                    : "text-[var(--accent-deep)]"
                }
              >
                <Mxn cents={Math.abs(ev.amountCents)} />
                {ev.amountCents < 0 ? " −" : " +"}
              </span>
            </li>
          ))}
        </ul>
        <Link href="/app/cashflow" className={`${btnGhost} mt-4 inline-flex`}>
          Ver flujo completo
        </Link>
      </Panel>
    </div>
  );
}
