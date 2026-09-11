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
          className={`tabular-nums font-medium ${over ? "text-[var(--danger-ink)]" : "text-[var(--ink)]"}`}
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
    <div className="min-w-0">
      <p className="text-xs text-[var(--muted)]">{label}</p>
      <p className="mt-1 font-[family-name:var(--font-display)] text-2xl tracking-tight text-[var(--ink)] tabular-nums md:text-[1.75rem]">
        {children}
      </p>
      {hint ? (
        <p className="mt-1 text-xs text-[var(--muted)]">{hint}</p>
      ) : null}
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
    <ol className="relative space-y-0">
      {items.map((item, i) => {
        const days = daysBetween(today, item.date);
        const urgency = urgencyFromDays(days);
        return (
          <li
            key={item.id}
            className="grid grid-cols-[1rem_1fr] gap-x-3"
          >
            <div className="relative flex flex-col items-center">
              <span
                className={`mt-2 size-2.5 shrink-0 rounded-full ${urgencyDot[urgency]}`}
              />
              {i < items.length - 1 ? (
                <span className="mt-1 w-px flex-1 bg-[var(--line)]" />
              ) : null}
            </div>
            <div className={`pb-5 ${i === items.length - 1 ? "pb-0" : ""}`}>
              <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
                <div>
                  <p className="font-medium text-[var(--ink)]">
                    <Link
                      href={`/app/accounts/${item.accountId}`}
                      className="hover:underline"
                    >
                      {item.accountName}
                    </Link>
                    <span className="mx-1.5 text-[var(--line)]">·</span>
                    <span className="font-normal text-[var(--muted)]">
                      {item.kind === "corte" ? "Corte" : "Fecha límite de pago"}
                    </span>
                  </p>
                  <p className={`mt-0.5 text-xs ${urgencyTone[urgency]}`}>
                    {formatWeekdayDate(item.date)} · {relativeDayLabel(days)}
                  </p>
                </div>
                {item.amountCents != null ? (
                  <div className="text-right">
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
