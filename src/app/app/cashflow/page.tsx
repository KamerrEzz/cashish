import Link from "next/link";
import { requireProject } from "@/lib/projects";
import { todayMexico } from "@/lib/credit-cycle";
import { projectCashflow } from "@/lib/cashflow/engine";
import { suggestPayToAvoidInterest } from "@/lib/cashflow/engine";
import {
  createPlannedInflow,
  createInstallmentPlan,
} from "@/app/actions/cashflow";
import { PageHeader, Panel, Field, inputClass, Mxn, btnGhost } from "@/components/ui";
import { SubmitButton } from "@/components/submit-button";
import { SectionTitle } from "@/components/empty-state";

export default async function CashflowPage() {
  const { supabase, project } = await requireProject();
  const today = todayMexico();
  const horizonDays = 60;

  const [
    { data: accounts },
    { data: profiles },
    { data: openPeriods },
    { data: closedPeriods },
    { data: subscriptions },
    { data: planned },
    { data: installments },
  ] = await Promise.all([
    supabase
      .from("accounts")
      .select("*")
      .eq("project_id", project.id)
      .eq("is_archived", false),
    supabase
      .from("credit_card_profiles")
      .select("*")
      .eq("project_id", project.id),
    supabase
      .from("statement_periods")
      .select("*")
      .eq("project_id", project.id)
      .eq("status", "open"),
    supabase
      .from("statement_periods")
      .select("*")
      .eq("project_id", project.id)
      .eq("status", "closed")
      .order("closes_on", { ascending: false }),
    supabase
      .from("subscriptions")
      .select("*")
      .eq("project_id", project.id)
      .eq("is_active", true),
    supabase
      .from("planned_inflows")
      .select("*")
      .eq("project_id", project.id)
      .eq("is_active", true),
    supabase
      .from("installment_plans")
      .select("*")
      .eq("project_id", project.id)
      .eq("is_active", true),
  ]);

  const liquid = (accounts ?? []).filter((a) => a.type !== "credit_card");
  const cards = (accounts ?? []).filter((a) => a.type === "credit_card");
  const profileBy = new Map((profiles ?? []).map((p) => [p.account_id, p]));
  const openBy = new Map((openPeriods ?? []).map((p) => [p.account_id, p]));
  const closedByAccount = new Map<
    string,
    {
      account_id: string;
      due_on: string;
      closing_balance_cents: number | null;
      minimum_payment_cents: number;
    }
  >();
  for (const p of closedPeriods ?? []) {
    if (!closedByAccount.has(p.account_id)) closedByAccount.set(p.account_id, p);
  }

  const startingLiquidCents = liquid.reduce((s, a) => s + a.balance_cents, 0);

  const creditObligations = cards.map((card) => {
    const open = openBy.get(card.id);
    const closed = closedByAccount.get(card.id);
    const profile = profileBy.get(card.id);
    const dueOn = closed?.due_on ?? open?.due_on ?? today;
    const suggestion = suggestPayToAvoidInterest({
      closingBalanceCents: closed?.closing_balance_cents ?? null,
      currentDebtCents: card.balance_cents,
      minimumCents:
        closed?.minimum_payment_cents ||
        open?.minimum_payment_cents ||
        profile?.minimum_payment_cents ||
        0,
    });
    return {
      accountId: card.id,
      accountName: card.name,
      dueOn,
      minimumCents: suggestion.minimumCents,
      balanceCents: suggestion.avoidInterestCents,
    };
  });

  const forecast = projectCashflow({
    asOf: today,
    horizonDays,
    startingLiquidCents,
    plannedInflows: (planned ?? []).map((p) => ({
      id: p.id,
      label: p.label,
      amountCents: p.amount_cents,
      nextOn: p.next_on,
      frequency: p.frequency,
    })),
    subscriptions: (subscriptions ?? []).map((s) => ({
      id: s.id,
      name: s.name,
      amountCents: s.amount_cents,
      nextBillingOn: s.next_billing_on,
      frequency: s.frequency,
    })),
    creditObligations,
    installments: (installments ?? []).map((i) => ({
      id: i.id,
      label: i.label,
      installmentCents: i.installment_cents,
      nextDueOn: i.next_due_on,
      monthsRemaining: i.months_remaining,
    })),
  });

  return (
    <div className="dash-enter space-y-6 sm:space-y-8">
      <PageHeader
        title="Flujo de caja"
        subtitle={`Proyección a ${horizonDays} días desde liquidez actual.`}
        action={
          <Link href="/app" className={btnGhost}>
            Inicio
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Panel className="!p-4">
          <p className="text-xs text-[var(--muted)]">Liquidez inicial</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl tabular-nums">
            <Mxn cents={forecast.startingLiquidCents} />
          </p>
        </Panel>
        <Panel className="!p-4">
          <p className="text-xs text-[var(--muted)]">Al final del horizonte</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl tabular-nums">
            <Mxn cents={forecast.endingLiquidCents} />
          </p>
        </Panel>
        <Panel
          className={`!p-4 ${
            forecast.status === "shortfall"
              ? "border-[var(--warn)]/30 bg-[var(--warn-soft)]"
              : ""
          }`}
        >
          <p className="text-xs text-[var(--muted)]">Estado</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl">
            {forecast.status === "shortfall" ? "Faltante" : "Cubierto"}
          </p>
          {forecast.firstShortfallOn ? (
            <p className="mt-1 text-xs text-[var(--muted)]">
              Desde {forecast.firstShortfallOn} ·{" "}
              <Mxn cents={forecast.shortfallCents} />
            </p>
          ) : null}
        </Panel>
      </div>

      <Panel>
        <SectionTitle
          title="Línea de tiempo"
          subtitle="Ingresos planeados, suscripciones, mínimos TDC y MSI"
        />
        <ul className="mt-4 max-h-[28rem] divide-y divide-[var(--line)] overflow-auto">
          {forecast.events.length === 0 ? (
            <li className="py-3 text-sm text-[var(--muted)]">
              Sin eventos en el horizonte. Agrega ingresos o suscripciones.
            </li>
          ) : (
            forecast.events.map((ev, idx) => (
              <li
                key={`${ev.date}-${ev.kind}-${idx}`}
                className="flex items-start justify-between gap-3 py-2.5"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium text-[var(--ink)]">
                    {ev.label}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    {ev.date} · {ev.kind}
                  </p>
                </div>
                <Mxn
                  cents={Math.abs(ev.amountCents)}
                  className={`shrink-0 tabular-nums font-medium ${
                    ev.amountCents < 0
                      ? "text-[var(--danger-ink)]"
                      : "text-[var(--accent-deep)]"
                  }`}
                />
              </li>
            ))
          )}
        </ul>
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel>
          <SectionTitle
            title="Ingreso planeado"
            subtitle="Nómina u otros ingresos esperados"
          />
          <form
            action={async (formData) => {
              "use server";
              await createPlannedInflow(formData);
            }}
            className="mt-4 space-y-3"
          >
            <Field label="Etiqueta">
              <input name="label" required className={inputClass} placeholder="Nómina" />
            </Field>
            <Field label="Monto">
              <input name="amount" required className={inputClass} placeholder="25000.00" />
            </Field>
            <Field label="Próxima fecha">
              <input
                type="date"
                name="nextOn"
                required
                className={inputClass}
                defaultValue={today}
              />
            </Field>
            <Field label="Frecuencia">
              <select name="frequency" className={inputClass} defaultValue="monthly">
                <option value="weekly">Semanal</option>
                <option value="monthly">Mensual</option>
                <option value="yearly">Anual</option>
              </select>
            </Field>
            <SubmitButton>Agregar ingreso</SubmitButton>
          </form>
        </Panel>

        <Panel>
          <SectionTitle
            title="Plan MSI"
            subtitle="Meses sin intereses — entra al flujo como cargo mensual"
          />
          <form
            action={async (formData) => {
              "use server";
              await createInstallmentPlan(formData);
            }}
            className="mt-4 space-y-3"
          >
            <Field label="Etiqueta">
              <input name="label" required className={inputClass} placeholder="Laptop 12 MSI" />
            </Field>
            <Field label="Cuenta / TDC">
              <select name="accountId" required className={inputClass}>
                {(accounts ?? []).map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Total">
              <input name="total" required className={inputClass} placeholder="12000.00" />
            </Field>
            <Field label="Meses">
              <input
                type="number"
                name="months"
                min={2}
                max={48}
                required
                className={inputClass}
                defaultValue={12}
              />
            </Field>
            <Field label="Primer vencimiento">
              <input
                type="date"
                name="firstDueOn"
                required
                className={inputClass}
                defaultValue={today}
              />
            </Field>
            <SubmitButton>Registrar MSI</SubmitButton>
          </form>
          {(installments ?? []).length > 0 ? (
            <ul className="mt-4 divide-y divide-[var(--line)] text-sm">
              {(installments ?? []).map((i) => (
                <li key={i.id} className="flex justify-between gap-2 py-2">
                  <span>
                    {i.label} · {i.months_remaining}/{i.months_total}
                  </span>
                  <Mxn cents={i.installment_cents} />
                </li>
              ))}
            </ul>
          ) : null}
        </Panel>
      </div>
    </div>
  );
}
