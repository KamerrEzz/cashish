import { requireProject } from "@/lib/projects";
import { availableCreditCents, todayMexico } from "@/lib/credit-cycle";
import { daysBetween, formatDateMx } from "@/lib/dates";
import { asCurrency, CURRENCIES, type Currency } from "@/lib/money";
import { Mxn, PageHeader, Panel } from "@/components/ui";
import { EmptyState, SectionTitle } from "@/components/empty-state";
import {
  StatCell,
  SummaryCell,
  SummaryStrip,
  UtilizationBar,
} from "@/components/dashboard/credit-ui";
import {
  CashflowAreaChart,
  CategoryPieChart,
  IncomeExpenseCompareChart,
  MerchantBarChart,
} from "@/components/analytics/charts";
import {
  buildCategoryBreakdown,
  buildDailyFlow,
  buildMerchantBars,
  monthCompare,
} from "@/lib/analytics/series";
import Link from "next/link";

function monthBounds(todayIso: string) {
  const [y, m] = todayIso.split("-").map(Number);
  const start = `${y}-${String(m).padStart(2, "0")}-01`;
  const endDate = new Date(y, m, 0);
  const end = `${y}-${String(m).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;
  return {
    start,
    end,
    label: formatDateMx(start, { month: "long", year: "numeric" }),
  };
}

function prevMonthBounds(todayIso: string) {
  const [y, m] = todayIso.split("-").map(Number);
  const d = new Date(y, m - 2, 1);
  const py = d.getFullYear();
  const pm = d.getMonth() + 1;
  const start = `${py}-${String(pm).padStart(2, "0")}-01`;
  const endDate = new Date(py, pm, 0);
  const end = `${py}-${String(pm).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;
  return { start, end };
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
  const { supabase, user, project } = await requireProject();
  const today = todayMexico();
  const { start: monthStart, end: monthEnd, label: monthLabel } =
    monthBounds(today);
  const prev = prevMonthBounds(today);
  const since30 = daysAgoIso(today, 30);
  const since90 = daysAgoIso(today, 90);

  const [
    { data: accounts },
    { data: profiles },
    { data: openPeriods },
    { data: subscriptions },
    { data: txsMonth },
    { data: txsPrevMonth },
    { data: txs30 },
    { data: txs90 },
    { data: ownedMemberships },
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
      .from("subscriptions")
      .select("*")
      .eq("project_id", project.id)
      .eq("is_active", true),
    supabase
      .from("transactions")
      .select("type, amount_cents, currency, occurred_on, merchant, category, transfer_id")
      .eq("project_id", project.id)
      .gte("occurred_on", monthStart)
      .lte("occurred_on", monthEnd),
    supabase
      .from("transactions")
      .select("type, amount_cents, currency, occurred_on, merchant, category, transfer_id")
      .eq("project_id", project.id)
      .gte("occurred_on", prev.start)
      .lte("occurred_on", prev.end),
    supabase
      .from("transactions")
      .select("type, amount_cents, currency, occurred_on, merchant, category, transfer_id")
      .eq("project_id", project.id)
      .gte("occurred_on", since30)
      .lte("occurred_on", today),
    supabase
      .from("transactions")
      .select("type, amount_cents, currency, occurred_on, merchant, category, transfer_id")
      .eq("project_id", project.id)
      .gte("occurred_on", since90)
      .lte("occurred_on", today),
    supabase
      .from("project_members")
      .select("project_id, projects(id, name, archived_at)")
      .eq("user_id", user.id)
      .eq("role", "owner"),
  ]);

  const ownedProjectIds = (ownedMemberships ?? [])
    .map((m) => {
      const p = m.projects as
        | { id: string; name: string; archived_at: string | null }
        | { id: string; name: string; archived_at: string | null }[]
        | null;
      const row = Array.isArray(p) ? p[0] : p;
      if (!row || row.archived_at) return null;
      return row;
    })
    .filter((p): p is { id: string; name: string; archived_at: string | null } =>
      Boolean(p),
    );

  const { data: ownedAccounts } =
    ownedProjectIds.length > 0
      ? await supabase
          .from("accounts")
          .select("project_id, type, balance_cents, currency, is_archived")
          .in(
            "project_id",
            ownedProjectIds.map((p) => p.id),
          )
          .eq("is_archived", false)
      : {
          data: [] as Array<{
            project_id: string;
            type: string;
            balance_cents: number;
            currency: string;
          }>,
        };

  const currenciesInUse = CURRENCIES.filter((c) =>
    (accounts ?? []).some((a) => asCurrency(a.currency) === c),
  );
  const reportCurrency: Currency = currenciesInUse[0] ?? "MXN";

  let ownerLiquid = 0;
  let ownerDebt = 0;
  for (const a of ownedAccounts ?? []) {
    if (asCurrency(a.currency) !== reportCurrency) continue;
    if (a.type === "credit_card") ownerDebt += a.balance_cents;
    else ownerLiquid += a.balance_cents;
  }

  const liquid = (accounts ?? []).filter(
    (a) => a.type !== "credit_card" && asCurrency(a.currency) === reportCurrency,
  );
  const cards = (accounts ?? []).filter(
    (a) => a.type === "credit_card" && asCurrency(a.currency) === reportCurrency,
  );
  const profileByAccount = new Map(
    (profiles ?? []).map((p) => [p.account_id, p]),
  );
  const periodByAccount = new Map(
    (openPeriods ?? []).map((p) => [p.account_id, p]),
  );

  const liquidTotal = liquid.reduce((s, a) => s + a.balance_cents, 0);
  const debtTotal = cards.reduce((s, a) => s + a.balance_cents, 0);
  const netWorth = liquidTotal - debtTotal;
  const limitTotal = cards.reduce(
    (s, a) => s + (profileByAccount.get(a.id)?.credit_limit_cents ?? 0),
    0,
  );
  const availableTotal = cards.reduce((s, a) => {
    const p = profileByAccount.get(a.id);
    return p
      ? s + availableCreditCents(p.credit_limit_cents, a.balance_cents)
      : s;
  }, 0);

  const subMonthly = (subscriptions ?? [])
    .filter((sub) => asCurrency(sub.currency) === reportCurrency)
    .reduce((s, sub) => {
    if (sub.frequency === "yearly") return s + Math.round(sub.amount_cents / 12);
    if (sub.frequency === "weekly")
      return s + Math.round(sub.amount_cents * 4.33);
    return s + sub.amount_cents;
  }, 0);

  const minPayments = cards.reduce((s, a) => {
    const period = periodByAccount.get(a.id);
    const profile = profileByAccount.get(a.id);
    return (
      s +
      (period?.minimum_payment_cents || profile?.minimum_payment_cents || 0)
    );
  }, 0);

  const inReportCcy = <T extends { currency: string }>(rows: T[] | null) =>
    (rows ?? []).filter((t) => asCurrency(t.currency) === reportCurrency);

  const txsMonthCcy = inReportCcy(txsMonth);
  const txsPrevCcy = inReportCcy(txsPrevMonth);
  const txs30Ccy = inReportCcy(txs30);
  const txs90Ccy = inReportCcy(txs90);

  const incomeMonth = txsMonthCcy
    .filter((t) => t.type === "income" && !t.transfer_id)
    .reduce((s, t) => s + t.amount_cents, 0);
  const expenseMonth = txsMonthCcy
    .filter((t) => t.type === "expense" && !t.transfer_id)
    .reduce((s, t) => s + t.amount_cents, 0);
  const incomePrev = txsPrevCcy
    .filter((t) => t.type === "income" && !t.transfer_id)
    .reduce((s, t) => s + t.amount_cents, 0);
  const expensePrev = txsPrevCcy
    .filter((t) => t.type === "expense" && !t.transfer_id)
    .reduce((s, t) => s + t.amount_cents, 0);
  const income30 = txs30Ccy
    .filter((t) => t.type === "income" && !t.transfer_id)
    .reduce((s, t) => s + t.amount_cents, 0);
  const expense30 = txs30Ccy
    .filter((t) => t.type === "expense" && !t.transfer_id)
    .reduce((s, t) => s + t.amount_cents, 0);

  const expenseCompare = monthCompare(expenseMonth, expensePrev);
  const daily90 = buildDailyFlow(txs90Ccy, since90, today);
  const categories = buildCategoryBreakdown(txs30Ccy);
  const merchants = buildMerchantBars(txs30Ccy, 8);

  const utilizationPct =
    limitTotal > 0 ? Math.round((debtTotal / limitTotal) * 100) : 0;
  const runwayDays =
    expense30 > 0 ? Math.round(liquidTotal / (expense30 / 30)) : null;
  const savingsRate =
    incomeMonth > 0
      ? Math.round(((incomeMonth - expenseMonth) / incomeMonth) * 100)
      : null;

  const dueSoon = cards
    .map((a) => {
      const period = periodByAccount.get(a.id);
      if (!period) return null;
      return {
        name: a.name,
        due: period.due_on,
        days: daysBetween(today, period.due_on),
        min:
          period.minimum_payment_cents ||
          profileByAccount.get(a.id)?.minimum_payment_cents ||
          0,
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
      `Con la liquidez actual cubres ${((liquidTotal / Math.max(debtTotal, 1)) * 100).toFixed(0)}% de la deuda TDC.`,
    );
  }
  if (minPayments > 0 && liquidTotal < minPayments) {
    insights.push(
      "Los pagos mínimos abiertos superan tu liquidez. Prioriza fondear débito antes del vencimiento.",
    );
  } else if (minPayments > 0) {
    insights.push(
      "Tienes liquidez suficiente para cubrir los pagos mínimos actuales.",
    );
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
  if (expenseCompare.deltaPct != null) {
    if (expenseCompare.deltaPct > 10) {
      insights.push(
        `Gastaste ${expenseCompare.deltaPct}% más que el mes pasado (${formatRough(Math.abs(expenseCompare.deltaCents))} de diferencia).`,
      );
    } else if (expenseCompare.deltaPct < -10) {
      insights.push(
        `Gastaste ${Math.abs(expenseCompare.deltaPct)}% menos que el mes pasado — buen control de ritmo.`,
      );
    }
  }
  if (savingsRate != null) {
    insights.push(
      savingsRate >= 20
        ? `Tasa de ahorro del mes: ${savingsRate}% (sólida si se sostiene).`
        : `Tasa de ahorro del mes: ${savingsRate}%. Meta saludable suele estar cerca de 20%+.`,
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
    <div className="dash-enter space-y-6 sm:space-y-8">
      <PageHeader
        title="Analíticas"
        subtitle={`Detalle de ${monthLabel} (${reportCurrency}): flujo, categorías y ritmo vs el mes anterior.`}
      />

      <SummaryStrip>
        <SummaryCell>
          <StatCell
            label={`Patrimonio neto (${reportCurrency})`}
            hint="Liquidez − deuda TDC"
          >
            <span
              className={
                netWorth < 0 ? "text-[var(--danger-ink)]" : "text-[var(--ink)]"
              }
            >
              {netWorth < 0 ? "−" : ""}
              <Mxn cents={absNet} currency={reportCurrency} />
            </span>
          </StatCell>
        </SummaryCell>
        <SummaryCell>
          <StatCell label="Flujo del mes" hint="Ingresos − gastos registrados">
            <span
              className={
                incomeMonth - expenseMonth >= 0
                  ? "text-[var(--positive)]"
                  : "text-[var(--danger-ink)]"
              }
            >
              {incomeMonth - expenseMonth < 0 ? "−" : "+"}
              <Mxn
                cents={Math.abs(incomeMonth - expenseMonth)}
                currency={reportCurrency}
              />
            </span>
          </StatCell>
        </SummaryCell>
        <SummaryCell>
          <StatCell
            label="Tasa de ahorro"
            hint={
              savingsRate == null ? "Sin ingresos este mes" : "(ing − gas) / ing"
            }
          >
            {savingsRate == null ? "—" : `${savingsRate}%`}
          </StatCell>
        </SummaryCell>
        <SummaryCell>
          <StatCell label="Vs mes anterior" hint="Cambio en gastos">
            <span
              className={
                expenseCompare.deltaCents > 0
                  ? "text-[var(--danger-ink)]"
                  : expenseCompare.deltaCents < 0
                    ? "text-[var(--positive)]"
                    : "text-[var(--ink)]"
              }
            >
              {expenseCompare.deltaPct == null
                ? "—"
                : `${expenseCompare.deltaPct > 0 ? "+" : ""}${expenseCompare.deltaPct}%`}
            </span>
          </StatCell>
        </SummaryCell>
      </SummaryStrip>

      <Panel>
        <SectionTitle
          title="Flujo diario · 90 días"
          subtitle="Ingresos y gastos capturados (sin transferencias internas)"
        />
        <div className="mt-4">
          <CashflowAreaChart data={daily90} />
        </div>
      </Panel>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        <Panel>
          <SectionTitle
            title="Este mes vs anterior"
            subtitle="Comparativo de ingresos y gastos"
          />
          <div className="mt-2">
            <IncomeExpenseCompareChart
              incomeMonth={incomeMonth}
              expenseMonth={expenseMonth}
              incomePrev={incomePrev}
              expensePrev={expensePrev}
            />
          </div>
        </Panel>
        <Panel>
          <SectionTitle
            title="Gastos por categoría · 30d"
            subtitle="Dónde se va el dinero"
          />
          <div className="mt-2">
            <CategoryPieChart data={categories} />
          </div>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
        <Panel>
          <SectionTitle
            title="Top comercios · 30d"
            subtitle="Ranking de gasto por comercio"
          />
          <div className="mt-2">
            <MerchantBarChart data={merchants} />
          </div>
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
          <dl className="mt-5 grid grid-cols-2 gap-3 border-t border-[var(--line)] pt-4 text-sm">
            <div>
              <dt className="text-xs text-[var(--muted)]">Uso de crédito</dt>
              <dd className="mt-0.5 font-medium tabular-nums">
                {utilizationPct}%
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--muted)]">Suscripciones / mes</dt>
              <dd className="mt-0.5 font-medium tabular-nums">
                <Mxn cents={subMonthly} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--muted)]">Pista de liquidez</dt>
              <dd className="mt-0.5 font-medium tabular-nums">
                {runwayDays == null ? "—" : `${runwayDays} días`}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--muted)]">Pagos mínimos</dt>
              <dd className="mt-0.5 font-medium tabular-nums">
                <Mxn cents={minPayments} />
              </dd>
            </div>
          </dl>
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-2">
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
              <dt className="text-xs text-[var(--muted)]">Ingresos · 30d</dt>
              <dd className="mt-0.5 font-medium text-[var(--positive)] tabular-nums">
                <Mxn cents={income30} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[var(--muted)]">Gastos · 30d</dt>
              <dd className="mt-0.5 font-medium tabular-nums">
                <Mxn cents={expense30} />
              </dd>
            </div>
          </dl>
          <Link
            href="/app/transactions"
            className="mt-3 inline-block text-xs text-[var(--accent)] underline-offset-2 hover:underline"
          >
            Ir a movimientos
          </Link>
        </Panel>

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
            <ul className="grid grid-cols-1 gap-3">
              {cards.map((a) => {
                const p = profileByAccount.get(a.id);
                const due = dueSoon.find((d) => d.name === a.name);
                return (
                  <li
                    key={a.id}
                    className="rounded-[var(--radius)] border border-[var(--line)] bg-[var(--wash)]/50 p-4"
                  >
                    <div className="flex justify-between gap-2">
                      <Link
                        href={`/app/accounts/${a.id}`}
                        className="font-medium hover:underline"
                      >
                        {a.name}
                      </Link>
                      <Mxn
                        cents={a.balance_cents}
                        className="tabular-nums font-medium"
                      />
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

      {ownedProjectIds.length > 1 ? (
        <Panel>
          <SectionTitle
            title="Rollup de proyectos propios"
            subtitle="Suma de liquidez y deuda TDC en proyectos donde eres dueño"
          />
          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-xs text-[var(--muted)]">Liquidez total</p>
              <p className="mt-1 font-[family-name:var(--font-display)] text-xl tabular-nums">
                <Mxn cents={ownerLiquid} />
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--muted)]">Deuda TDC</p>
              <p className="mt-1 font-[family-name:var(--font-display)] text-xl tabular-nums">
                <Mxn cents={ownerDebt} />
              </p>
            </div>
            <div>
              <p className="text-xs text-[var(--muted)]">Neto dueño</p>
              <p className="mt-1 font-[family-name:var(--font-display)] text-xl tabular-nums">
                <Mxn cents={ownerLiquid - ownerDebt} />
              </p>
            </div>
          </div>
          <p className="mt-3 text-xs text-[var(--muted)]">
            {ownedProjectIds.length} proyectos · la vista principal sigue siendo
            solo “{project.name}”.
          </p>
        </Panel>
      ) : null}
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
        <div
          className={`h-full rounded-full ${fill}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
