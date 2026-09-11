import { requireUser } from "@/lib/auth";
import { availableCreditCents, todayMexico } from "@/lib/credit-cycle";
import { daysBetween, formatDateMx } from "@/lib/dates";
import { Mxn, PageHeader, Panel } from "@/components/ui";
import { EmptyState, SectionTitle } from "@/components/empty-state";
import { StatCell, UtilizationBar } from "@/components/dashboard/credit-ui";
import Link from "next/link";

function monthBounds(todayIso: string) {
  const [y, m] = todayIso.split("-").map(Number);
  const start = `${y}-${String(m).padStart(2, "0")}-01`;
  const endDate = new Date(y, m, 0);
  const end = `${y}-${String(m).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;
  return { start, end, label: formatDateMx(start, { month: "long", year: "numeric" }) };
}

function daysAgoIso(todayIso: string, days: number) {
  const d = new Date(`${todayIso}T12:00:00`);
  d.setDate(d.getDate() - days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default async function AnalyticsPage() {
  const { supabase } = await requireUser();
  const today = todayMexico();
  const { start: monthStart, end: monthEnd, label: monthLabel } = monthBounds(today);
  const since30 = daysAgoIso(today, 30);

  const [
    { data: accounts },
    { data: profiles },
    { data: openPeriods },
    { data: subscriptions },
    { data: txsMonth },
    { data: txs30 },
  ] = await Promise.all([
    supabase.from("accounts").select("*").eq("is_archived", false),
    supabase.from("credit_card_profiles").select("*"),
    supabase.from("statement_periods").select("*").eq("status", "open"),
    supabase.from("subscriptions").select("*").eq("is_active", true),
    supabase
      .from("transactions")
      .select("type, amount_cents, occurred_on, merchant, category")
      .gte("occurred_on", monthStart)
      .lte("occurred_on", monthEnd),
    supabase
      .from("transactions")
      .select("type, amount_cents, occurred_on, merchant, category")
      .gte("occurred_on", since30)
      .lte("occurred_on", today),
  ]);

  const liquid = (accounts ?? []).filter((a) => a.type !== "credit_card");
  const cards = (accounts ?? []).filter((a) => a.type === "credit_card");
  const profileByAccount = new Map((profiles ?? []).map((p) => [p.account_id, p]));
  const periodByAccount = new Map((openPeriods ?? []).map((p) => [p.account_id, p]));

  const liquidTotal = liquid.reduce((s, a) => s + a.balance_cents, 0);
  const debtTotal = cards.reduce((s, a) => s + a.balance_cents, 0);
  const netWorth = liquidTotal - debtTotal;
  const limitTotal = cards.reduce(
    (s, a) => s + (profileByAccount.get(a.id)?.credit_limit_cents ?? 0),
    0,
  );
  const availableTotal = cards.reduce((s, a) => {
    const p = profileByAccount.get(a.id);
    return p ? s + availableCreditCents(p.credit_limit_cents, a.balance_cents) : s;
  }, 0);

  const subMonthly = (subscriptions ?? []).reduce((s, sub) => {
    if (sub.frequency === "yearly") return s + Math.round(sub.amount_cents / 12);
    if (sub.frequency === "weekly") return s + Math.round(sub.amount_cents * 4.33);
    return s + sub.amount_cents;
  }, 0);

  const minPayments = cards.reduce((s, a) => {
    const period = periodByAccount.get(a.id);
    const profile = profileByAccount.get(a.id);
    return s + (period?.minimum_payment_cents || profile?.minimum_payment_cents || 0);
  }, 0);

  const incomeMonth = (txsMonth ?? [])
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount_cents, 0);
  const expenseMonth = (txsMonth ?? [])
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount_cents, 0);
  const income30 = (txs30 ?? [])
    .filter((t) => t.type === "income")
    .reduce((s, t) => s + t.amount_cents, 0);
  const expense30 = (txs30 ?? [])
    .filter((t) => t.type === "expense")
    .reduce((s, t) => s + t.amount_cents, 0);

  const byMerchant = new Map<string, number>();
  for (const t of txs30 ?? []) {
    if (t.type !== "expense") continue;
    const key = (t.merchant || t.category || "Sin nombre").trim() || "Sin nombre";
    byMerchant.set(key, (byMerchant.get(key) ?? 0) + t.amount_cents);
  }
  const topMerchants = [...byMerchant.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  const utilizationPct =
    limitTotal > 0 ? Math.round((debtTotal / limitTotal) * 100) : 0;

  const runwayDays =
    expense30 > 0
      ? Math.round((liquidTotal / (expense30 / 30)) )
      : null;

  const dueSoon = cards
    .map((a) => {
      const period = periodByAccount.get(a.id);
      if (!period) return null;
      return {
        name: a.name,
        due: period.due_on,
        days: daysBetween(today, period.due_on),
        min: period.minimum_payment_cents || profileByAccount.get(a.id)?.minimum_payment_cents || 0,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x != null)
    .sort((a, b) => a.days - b.days);

  const insights: string[] = [];
  if (netWorth < 0) {
    insights.push(
      "Tu deuda de tarjetas supera la liquidez: el patrimonio neto está en negativo.",
    );
  } else if (liquidTotal > 0 && debtTotal > 0) {
    insights.push(
      `Con la liquidez actual cubres ${(liquidTotal / Math.max(debtTotal, 1) * 100).toFixed(0)}% de la deuda TDC.`,
    );
  }
  if (minPayments > 0 && liquidTotal < minPayments) {
    insights.push(
      "Los pagos mínimos abiertos superan tu liquidez. Prioriza fondear débito antes del vencimiento.",
    );
  } else if (minPayments > 0) {
    insights.push("Tienes liquidez suficiente para cubrir los pagos mínimos actuales.");
  }
  if (subMonthly > 0) {
    insights.push(
      `Suscripciones ≈ ${formatRough(subMonthly)} al mes; en un año serían ~${formatRough(subMonthly * 12)}.`,
    );
  }
  if (utilizationPct >= 80) {
    insights.push(
      `Uso agregado de crédito al ${utilizationPct}%. Arriba de 80% suele afectar tu margen y tu score.`,
    );
  }
  if ((txsMonth ?? []).length === 0) {
    insights.push(
      "Aún hay pocos movimientos este mes: registra gastos e ingresos para que las analíticas cobren sentido.",
    );
  }
  if (runwayDays != null && runwayDays < 45 && expense30 > 0) {
    insights.push(
      `A este ritmo de gasto (30 días), tu liquidez alcanza ~${runwayDays} días sin nuevos ingresos.`,
    );
  }

  const absNet = Math.abs(netWorth);
  const compositionMax = Math.max(liquidTotal, debtTotal, 1);

  return (
    <div className="dash-enter space-y-8">
      <PageHeader
        title="Analíticas"
        subtitle={`Panorama de ${monthLabel}: patrimonio, flujo, crédito y suscripciones.`}
      />

      <section className="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
        <div className="grid gap-6 p-5 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0 lg:divide-x lg:divide-[var(--line)] lg:p-0">
          <div className="lg:p-5">
            <StatCell
              label="Patrimonio neto"
              hint="Liquidez − deuda TDC"
            >
              <span
                className={
                  netWorth < 0 ? "text-[var(--danger-ink)]" : "text-[var(--ink)]"
                }
              >
                {netWorth < 0 ? "−" : ""}
                <Mxn cents={absNet} />
              </span>
            </StatCell>
          </div>
          <div className="lg:p-5">
            <StatCell label="Flujo del mes" hint="Ingresos − gastos registrados">
              <span
                className={
                  incomeMonth - expenseMonth >= 0
                    ? "text-[var(--positive)]"
                    : "text-[var(--danger-ink)]"
                }
              >
                {incomeMonth - expenseMonth < 0 ? "−" : "+"}
                <Mxn cents={Math.abs(incomeMonth - expenseMonth)} />
              </span>
            </StatCell>
          </div>
          <div className="lg:p-5">
            <StatCell label="Uso de crédito" hint="Deuda / límite agregado">
              {utilizationPct}%
            </StatCell>
          </div>
          <div className="lg:p-5">
            <StatCell label="Suscripciones / mes" hint={`${(subscriptions ?? []).length} activas`}>
              <Mxn cents={subMonthly} />
            </StatCell>
          </div>
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <SectionTitle
            title="Composición"
            subtitle="Cómo se reparte tu posición hoy"
          />
          <CompositionRow
            label="Liquidez"
            cents={liquidTotal}
            max={compositionMax}
            tone="positive"
          />
          <CompositionRow
            label="Deuda TDC"
            cents={debtTotal}
            max={compositionMax}
            tone="debt"
          />
          <CompositionRow
            label="Crédito disponible"
            cents={Math.max(0, availableTotal)}
            max={Math.max(limitTotal, compositionMax)}
            tone="accent"
          />
          <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-[var(--line)] pt-4 text-sm">
            <div>
              <dt className="text-xs text-[var(--muted)]">Pagos mínimos</dt>
              <dd className="mt-0.5 font-medium tabular-nums">
                <Mxn cents={minPayments} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--muted)]">Límite total</dt>
              <dd className="mt-0.5 font-medium tabular-nums">
                <Mxn cents={limitTotal} />
              </dd>
            </div>
          </dl>
        </Panel>

        <Panel>
          <SectionTitle
            title="Lectura rápida"
            subtitle="Señales accionables, no ruido"
          />
          {insights.length === 0 ? (
            <EmptyState
              title="Todo en calma"
              body="Cuando registres más movimiento, aquí verás alertas de cobertura, uso de crédito y ritmo de gasto."
            />
          ) : (
            <ul className="space-y-3">
              {insights.map((text) => (
                <li
                  key={text}
                  className="flex gap-3 text-sm leading-relaxed text-[var(--ink)]"
                >
                  <span
                    className="mt-2 size-1.5 shrink-0 rounded-full bg-[var(--accent)]"
                    aria-hidden
                  />
                  <span>{text}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel>
          <SectionTitle
            title="Flujo registrado"
            subtitle="Basado en movimientos que ya capturaste"
          />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-[var(--muted)]">Ingresos · mes</p>
              <p className="mt-1 font-[family-name:var(--font-display)] text-xl text-[var(--positive)] tabular-nums">
                <Mxn cents={incomeMonth} />
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--muted)]">Gastos · mes</p>
              <p className="mt-1 font-[family-name:var(--font-display)] text-xl tabular-nums">
                <Mxn cents={expenseMonth} />
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--muted)]">Ingresos · 30 días</p>
              <p className="mt-1 font-medium text-[var(--positive)] tabular-nums">
                <Mxn cents={income30} />
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--muted)]">Gastos · 30 días</p>
              <p className="mt-1 font-medium tabular-nums">
                <Mxn cents={expense30} />
              </p>
            </div>
          </div>
          {runwayDays != null ? (
            <p className="mt-4 text-sm text-[var(--muted)]">
              Pista de liquidez ≈ <strong className="text-[var(--ink)]">{runwayDays} días</strong> al
              ritmo de los últimos 30 días.
            </p>
          ) : (
            <p className="mt-4 text-sm text-[var(--muted)]">
              Registra gastos para estimar cuántos días cubre tu liquidez.
            </p>
          )}
          <Link
            href="/app/transactions"
            className="mt-3 inline-block text-xs text-[var(--accent)] underline-offset-2 hover:underline"
          >
            Ir a movimientos
          </Link>
        </Panel>

        <Panel>
          <SectionTitle
            title="Principales comercios"
            subtitle="Gastos de los últimos 30 días"
          />
          {topMerchants.length === 0 ? (
            <EmptyState
              title="Sin gastos tipados"
              body="Cuando registres expenses con comercio, aquí verás el ranking."
              actionHref="/app/transactions"
              actionLabel="Registrar gasto"
            />
          ) : (
            <ul className="space-y-3">
              {topMerchants.map(([name, cents]) => {
                const pct = expense30 > 0 ? Math.round((cents / expense30) * 100) : 0;
                return (
                  <li key={name}>
                    <div className="flex justify-between gap-2 text-sm">
                      <span className="truncate font-medium">{name}</span>
                      <Mxn cents={cents} className="shrink-0 tabular-nums" />
                    </div>
                    <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-[var(--line)]">
                      <div
                        className="h-full rounded-full bg-[var(--accent)]"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
      </div>

      <Panel>
        <SectionTitle
          title="Crédito por tarjeta"
          subtitle="Uso del límite y cercanía al pago"
          action={
            <Link
              href="/app/accounts"
              className="text-xs text-[var(--muted)] underline-offset-2 hover:underline"
            >
              Cuentas
            </Link>
          }
        />
        {cards.length === 0 ? (
          <EmptyState
            title="Sin tarjetas"
            body="Agrega una TDC para ver utilización y calendario."
            actionHref="/app/accounts/new"
            actionLabel="Nueva cuenta"
          />
        ) : (
          <ul className="grid gap-4 md:grid-cols-2">
            {cards.map((a) => {
              const p = profileByAccount.get(a.id);
              const due = dueSoon.find((d) => d.name === a.name);
              return (
                <li
                  key={a.id}
                  className="rounded-xl border border-[var(--line)] bg-[var(--wash)]/50 p-4"
                >
                  <div className="flex justify-between gap-2">
                    <Link
                      href={`/app/accounts/${a.id}`}
                      className="font-medium hover:underline"
                    >
                      {a.name}
                    </Link>
                    <Mxn cents={a.balance_cents} className="tabular-nums font-medium" />
                  </div>
                  {p ? (
                    <UtilizationBar
                      owedCents={a.balance_cents}
                      limitCents={p.credit_limit_cents}
                    />
                  ) : null}
                  {due ? (
                    <p className="mt-2 text-xs text-[var(--muted)]">
                      Pago {due.due}
                      {due.days <= 14
                        ? ` · ${due.days <= 0 ? "hoy" : `en ${due.days}d`}`
                        : ""}
                      {due.min > 0 ? (
                        <>
                          {" "}
                          · mín. <Mxn cents={due.min} />
                        </>
                      ) : null}
                    </p>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </div>
  );
}

function formatRough(cents: number) {
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function CompositionRow({
  label,
  cents,
  max,
  tone,
}: {
  label: string;
  cents: number;
  max: number;
  tone: "positive" | "debt" | "accent";
}) {
  const pct = max > 0 ? Math.min(100, Math.round((cents / max) * 100)) : 0;
  const fill =
    tone === "positive"
      ? "bg-[var(--positive)]"
      : tone === "debt"
        ? "bg-[var(--danger)]"
        : "bg-[var(--accent)]";
  return (
    <div className="mt-3 first:mt-0">
      <div className="flex justify-between gap-2 text-sm">
        <span className="text-[var(--muted)]">{label}</span>
        <Mxn cents={cents} className="tabular-nums font-medium" />
      </div>
      <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[var(--line)]">
        <div className={`h-full rounded-full ${fill}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
