import { formatMxn, money } from "@/lib/money";
import type { DailyBalancePoint } from "@/lib/quincena";
import type { CashflowResult } from "@/lib/cashflow/engine";

export function CashflowRunway({
  forecast,
  daily,
  maxPoints = 31,
}: {
  forecast: CashflowResult;
  daily: DailyBalancePoint[];
  maxPoints?: number;
}) {
  const series = daily.slice(0, maxPoints + 1);
  if (series.length < 2) {
    return (
      <p className="text-sm text-[var(--muted)]">Sin datos para proyectar.</p>
    );
  }

  const values = series.map((p) => p.balanceCents);
  const min = Math.min(0, ...values);
  const max = Math.max(0, ...values);
  const span = Math.max(max - min, 1);
  const w = 640;
  const h = 160;
  const pad = 12;

  const points = series
    .map((p, i) => {
      const x = pad + (i / (series.length - 1)) * (w - pad * 2);
      const y = pad + (1 - (p.balanceCents - min) / span) * (h - pad * 2);
      return `${x},${y}`;
    })
    .join(" ");

  const zeroY = pad + (1 - (0 - min) / span) * (h - pad * 2);
  const shortfallIdx = forecast.firstShortfallOn
    ? series.findIndex((p) => p.date === forecast.firstShortfallOn)
    : -1;

  return (
    <div className="space-y-3">
      <svg
        viewBox={`0 0 ${w} ${h}`}
        className="h-40 w-full overflow-visible"
        role="img"
        aria-label="Proyección de liquidez"
      >
        <line
          x1={pad}
          x2={w - pad}
          y1={zeroY}
          y2={zeroY}
          stroke="var(--line)"
          strokeDasharray="4 4"
        />
        <polyline
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2.5"
          strokeLinejoin="round"
          strokeLinecap="round"
          points={points}
        />
        {shortfallIdx >= 0 ? (
          <circle
            cx={
              pad +
              (shortfallIdx / (series.length - 1)) * (w - pad * 2)
            }
            cy={
              pad +
              (1 - (series[shortfallIdx].balanceCents - min) / span) *
                (h - pad * 2)
            }
            r="5"
            fill="var(--danger-ink)"
          />
        ) : null}
      </svg>
      <div className="flex flex-wrap gap-4 text-xs text-[var(--muted)]">
        <span>
          Hoy{" "}
          <strong className="text-[var(--ink)]">
            {formatMxn(money(forecast.startingLiquidCents))}
          </strong>
        </span>
        <span>
          Mín. proyectado{" "}
          <strong className="text-[var(--ink)]">
            {formatMxn(money(forecast.minBalanceCents))}
          </strong>
        </span>
        <span>
          Al día {forecast.horizonDays}{" "}
          <strong className="text-[var(--ink)]">
            {formatMxn(money(forecast.endingLiquidCents))}
          </strong>
        </span>
      </div>
    </div>
  );
}
