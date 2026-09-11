import Link from "next/link";
import { Mxn } from "@/components/ui";
import {
  daysBetween,
  formatWeekdayDate,
  relativeDayLabel,
} from "@/lib/dates";

export type Urgency = "calm" | "soon" | "due" | "overdue" | "overlimit";

export function urgencyFromDays(days: number): Urgency {
  if (days < 0) return "overdue";
  if (days <= 2) return "due";
  if (days <= 7) return "soon";
  return "calm";
}

const urgencyTone: Record<Urgency, string> = {
  calm: "text-[var(--muted)]",
  soon: "text-[var(--warn-ink)]",
  due: "text-[var(--danger-ink)]",
  overdue: "text-[var(--danger-ink)]",
  overlimit: "text-[var(--danger-ink)]",
};

const urgencyDot: Record<Urgency, string> = {
  calm: "bg-[var(--accent)]",
  soon: "bg-[var(--warn)]",
  due: "bg-[var(--danger)]",
  overdue: "bg-[var(--danger)]",
  overlimit: "bg-[var(--danger)]",
};

export function UtilizationBar({
  owedCents,
  limitCents,
}: {
  owedCents: number;
  limitCents: number;
}) {
  const pct =
    limitCents <= 0 ? 0 : Math.min(140, Math.round((owedCents / limitCents) * 100));
  const over = owedCents > limitCents;
  const fill = over
    ? "bg-[var(--danger)]"
    : pct >= 80
      ? "bg-[var(--warn)]"
      : "bg-[var(--accent)]";

  return (
    <div className="mt-3">
      <div className="flex items-baseline justify-between gap-2 text-xs">
        <span className="text-[var(--muted)]">Uso del límite</span>
        <span
          className={`shrink-0 tabular-nums font-medium ${over ? "text-[var(--danger-ink)]" : "text-[var(--ink)]"}`}
        >
          {pct}%
          {over ? " · sobre límite" : null}
        </span>
      </div>
      <div
        className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--line)]"
        role="meter"
        aria-valuenow={Math.min(pct, 100)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`Uso del crédito ${pct} por ciento`}
      >
        <div
          className={`h-full rounded-full transition-[width] duration-700 ease-out ${fill}`}
          style={{ width: `${Math.min(pct, 100)}%` }}
        />
      </div>
    </div>
  );
}

export function StatCell({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <div className="min-w-0 overflow-hidden">
      <p className="truncate text-xs text-[var(--muted)]">{label}</p>
      <p className="mt-1.5 break-words font-[family-name:var(--font-display)] text-[clamp(1.25rem,2.6vw,1.75rem)] leading-tight tracking-tight text-[var(--ink)] tabular-nums">
        {children}
      </p>
      {hint ? (
        <p className="mt-1.5 line-clamp-2 text-xs leading-snug text-[var(--muted)]">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

/** Responsive summary strip used on home + analytics. */
export function SummaryStrip({ children }: { children: React.ReactNode }) {
  return (
    <section
      aria-label="Resumen"
      className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0 lg:overflow-hidden lg:rounded-2xl lg:border lg:border-[var(--line)] lg:bg-[var(--surface)] lg:shadow-[0_1px_0_rgba(20,40,30,0.04)]"
    >
      {children}
    </section>
  );
}

export function SummaryCell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-w-0 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[0_1px_0_rgba(20,40,30,0.04)] sm:p-5 lg:rounded-none lg:border-0 lg:border-r lg:border-[var(--line)] lg:shadow-none lg:last:border-r-0">
      {children}
    </div>
  );
}

export type AgendaItem = {
  id: string;
  kind: "corte" | "pago";
  accountId: string;
  accountName: string;
  date: string;
  amountCents?: number;
  amountLabel?: string;
};

export function CreditAgenda({
  items,
  today,
}: {
  items: AgendaItem[];
  today: string;
}) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-[var(--muted)]">
        Sin cortes ni pagos próximos.{" "}
        <Link href="/app/accounts/new" className="underline underline-offset-2">
          Agrega una tarjeta
        </Link>
      </p>
    );
  }

  return (
    <ol className="relative">
      {items.map((item, i) => {
        const days = daysBetween(today, item.date);
        const urgency = urgencyFromDays(days);
        const kindLabel = item.kind === "corte" ? "Corte" : "Pago";
        return (
          <li key={item.id} className="grid grid-cols-[0.75rem_minmax(0,1fr)] gap-x-3">
            <div className="relative flex flex-col items-center">
              <span
                className={`mt-2 size-2.5 shrink-0 rounded-full ${urgencyDot[urgency]}`}
              />
              {i < items.length - 1 ? (
                <span className="mt-1 w-px flex-1 bg-[var(--line)]" />
              ) : null}
            </div>
            <div className={i === items.length - 1 ? "pb-0" : "pb-4 sm:pb-5"}>
              <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-[var(--ink)]">
                    <Link
                      href={`/app/accounts/${item.accountId}`}
                      className="truncate font-medium hover:underline"
                    >
                      {item.accountName}
                    </Link>
                    <span className="text-[var(--line)]" aria-hidden>
                      ·
                    </span>
                    <span className="text-sm font-normal text-[var(--muted)]">
                      {kindLabel}
                    </span>
                  </p>
                  <p className={`mt-0.5 text-xs ${urgencyTone[urgency]}`}>
                    {formatWeekdayDate(item.date)} · {relativeDayLabel(days)}
                  </p>
                </div>
                {item.amountCents != null ? (
                  <div className="shrink-0 sm:text-right">
                    <Mxn
                      cents={item.amountCents}
                      className="font-medium tabular-nums text-[var(--ink)]"
                    />
                    {item.amountLabel ? (
                      <p className="text-xs text-[var(--muted)]">
                        {item.amountLabel}
                      </p>
                    ) : null}
                  </div>
                ) : null}
              </div>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
