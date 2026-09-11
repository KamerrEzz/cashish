import { formatMxn, money } from "@/lib/money";
import { ACCOUNT_TYPE_LABELS } from "@/lib/credit-cycle";

export function Mxn({ cents, className }: { cents: number; className?: string }) {
  return <span className={className}>{formatMxn(money(cents))}</span>;
}

export function accountTypeLabel(type: string) {
  return ACCOUNT_TYPE_LABELS[type] ?? type;
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-7 flex flex-col gap-4 sm:mb-9 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
      <div className="min-w-0">
        <h1 className="font-[family-name:var(--font-display)] text-[clamp(1.65rem,3.5vw,2.05rem)] font-semibold tracking-tight text-[var(--ink)]">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-[var(--muted)]">
            {subtitle}
          </p>
        ) : null}
      </div>
      {action ? (
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          {action}
        </div>
      ) : null}
    </div>
  );
}

export function Panel({
  children,
  className = "",
  id,
}: {
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section
      id={id}
      className={`rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] p-4 shadow-[var(--shadow)] sm:p-5 md:p-6 ${className}`}
    >
      {children}
    </section>
  );
}

export function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block text-sm">
      <span className="mb-1.5 block font-medium text-[var(--ink)]">{label}</span>
      {children}
    </label>
  );
}

export const inputClass =
  "w-full rounded-[var(--radius)] border border-[var(--line)] bg-[var(--input)] px-3 py-2.5 text-[var(--ink)] outline-none ring-[var(--accent)] placeholder:text-[var(--muted)] focus:ring-2";

export const btnPrimary =
  "inline-flex w-full items-center justify-center rounded-[var(--radius)] bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-90 disabled:opacity-50 sm:w-auto dark:text-[var(--wash)]";

export const btnGhost =
  "inline-flex w-full items-center justify-center rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] px-4 py-2.5 text-sm font-medium text-[var(--ink)] transition hover:bg-[var(--wash)] sm:w-auto";
