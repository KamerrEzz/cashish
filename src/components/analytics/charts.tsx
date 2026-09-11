"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type {
  CategorySlice,
  DailyFlowPoint,
  MerchantBar,
} from "@/lib/analytics/series";
import { formatMxn, money } from "@/lib/money";

const TOOLTIP_STYLE = {
  background: "var(--surface)",
  border: "1px solid var(--line)",
  borderRadius: "8px",
  color: "var(--ink)",
  fontSize: 12,
};

function mxnTick(v: number) {
  if (Math.abs(v) >= 1000) return `$${(v / 1000).toFixed(1)}k`;
  return `$${v.toFixed(0)}`;
}

export function CashflowAreaChart({ data }: { data: DailyFlowPoint[] }) {
  if (data.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-[var(--muted)]">
        Sin movimientos en el periodo.
      </p>
    );
  }
  return (
    <div className="h-64 w-full sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="cfIncome" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--positive)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--positive)" stopOpacity={0} />
            </linearGradient>
            <linearGradient id="cfExpense" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--danger)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--danger)" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="label"
            tick={{ fill: "var(--muted)", fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: "var(--line)" }}
            interval="preserveStartEnd"
            minTickGap={28}
          />
          <YAxis
            tickFormatter={mxnTick}
            tick={{ fill: "var(--muted)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value, name) => [
              formatMxn(money(Math.round(Number(value) * 100))),
              name === "income" ? "Ingresos" : name === "expense" ? "Gastos" : "Neto",
            ]}
            labelFormatter={(_, payload) =>
              payload?.[0]?.payload?.date
                ? String(payload[0].payload.date)
                : ""
            }
          />
          <Legend
            wrapperStyle={{ fontSize: 12, color: "var(--muted)" }}
            formatter={(v) =>
              v === "income" ? "Ingresos" : v === "expense" ? "Gastos" : v
            }
          />
          <Area
            type="monotone"
            dataKey="income"
            stroke="var(--positive)"
            fill="url(#cfIncome)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="expense"
            stroke="var(--danger)"
            fill="url(#cfExpense)"
            strokeWidth={2}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

const PIE_COLORS = [
  "var(--accent)",
  "var(--positive)",
  "var(--warn)",
  "var(--danger)",
  "#5b7c99",
  "#8b6b9a",
  "#4a7c6f",
  "#9a7b5a",
];

export function CategoryPieChart({ data }: { data: CategorySlice[] }) {
  if (data.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-[var(--muted)]">
        Sin gastos categorizados en el periodo.
      </p>
    );
  }
  const chartData = data.map((d) => ({
    name: d.name,
    value: d.cents / 100,
    pct: d.pct,
  }));
  return (
    <div className="h-64 w-full sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={chartData}
            dataKey="value"
            nameKey="name"
            innerRadius="52%"
            outerRadius="78%"
            paddingAngle={2}
            stroke="var(--surface)"
            strokeWidth={2}
          >
            {chartData.map((_, i) => (
              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value, _n, item) => [
              formatMxn(money(Math.round(Number(value) * 100))),
              `${item.payload.name} (${item.payload.pct}%)`,
            ]}
          />
          <Legend
            layout="vertical"
            align="right"
            verticalAlign="middle"
            wrapperStyle={{ fontSize: 11, color: "var(--muted)", maxWidth: 120 }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}

export function MerchantBarChart({ data }: { data: MerchantBar[] }) {
  if (data.length === 0) {
    return (
      <p className="py-10 text-center text-sm text-[var(--muted)]">
        Sin comercios en el periodo.
      </p>
    );
  }
  const chartData = data.map((d) => ({
    name: d.name.length > 16 ? `${d.name.slice(0, 14)}…` : d.name,
    full: d.name,
    amount: d.cents / 100,
  }));
  return (
    <div className="h-64 w-full sm:h-72">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={chartData}
          layout="vertical"
          margin={{ top: 4, right: 12, left: 4, bottom: 4 }}
        >
          <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" horizontal={false} />
          <XAxis
            type="number"
            tickFormatter={mxnTick}
            tick={{ fill: "var(--muted)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            type="category"
            dataKey="name"
            width={88}
            tick={{ fill: "var(--muted)", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value) => [
              formatMxn(money(Math.round(Number(value) * 100))),
              "Gasto",
            ]}
            labelFormatter={(_, payload) =>
              payload?.[0]?.payload?.full ?? ""
            }
          />
          <Bar
            dataKey="amount"
            fill="var(--accent)"
            radius={[0, 4, 4, 0]}
            maxBarSize={22}
          />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function IncomeExpenseCompareChart({
  incomeMonth,
  expenseMonth,
  incomePrev,
  expensePrev,
}: {
  incomeMonth: number;
  expenseMonth: number;
  incomePrev: number;
  expensePrev: number;
}) {
  const data = [
    {
      name: "Mes anterior",
      ingresos: incomePrev / 100,
      gastos: expensePrev / 100,
    },
    {
      name: "Este mes",
      ingresos: incomeMonth / 100,
      gastos: expenseMonth / 100,
    },
  ];
  return (
    <div className="h-56 w-full sm:h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="var(--line)" strokeDasharray="3 3" vertical={false} />
          <XAxis
            dataKey="name"
            tick={{ fill: "var(--muted)", fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "var(--line)" }}
          />
          <YAxis
            tickFormatter={mxnTick}
            tick={{ fill: "var(--muted)", fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={44}
          />
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value, name) => [
              formatMxn(money(Math.round(Number(value) * 100))),
              name === "ingresos" ? "Ingresos" : "Gastos",
            ]}
          />
          <Legend
            wrapperStyle={{ fontSize: 12 }}
            formatter={(v) => (v === "ingresos" ? "Ingresos" : "Gastos")}
          />
          <Bar dataKey="ingresos" fill="var(--positive)" radius={[4, 4, 0, 0]} maxBarSize={36} />
          <Bar dataKey="gastos" fill="var(--danger)" radius={[4, 4, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
