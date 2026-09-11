import Link from "next/link";
import { formatMxn, money } from "@/lib/money";

export function EmptyState({
  title,
  body,
  actionHref,
  actionLabel,
}: {
  title: string;
  body: string;
  actionHref?: string;
  actionLabel?: string;
}) {
  return (
    <div className="py-6 text-center sm:py-8">
      <p className="font-[family-name:var(--font-display)] text-lg text-[var(--ink)]">
        {title}
      </p>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-[var(--muted)]">
        {body}
      </p>
      {actionHref && actionLabel ? (
        <Link
          href={actionHref}
          className="mt-4 inline-flex text-sm font-medium text-[var(--accent)] underline-offset-2 hover:underline"
        >
          {actionLabel}
        </Link>
      ) : null}
    </div>
  );
}

export function SectionTitle({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 className="font-[family-name:var(--font-display)] text-xl text-[var(--ink)]">
          {title}
        </h2>
        {subtitle ? (
          <p className="mt-1 text-sm text-[var(--muted)]">{subtitle}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

/** Signed money: income green, expense ink, transfer muted. */
export function MoneyTone({
  cents,
  type,
  className = "",
}: {
  cents: number;
  type: "income" | "expense" | "transfer" | string;
  className?: string;
}) {
  const formatted = formatMxn(money(Math.abs(cents)));
  if (type === "income") {
    return (
      <span className={`tabular-nums text-[var(--positive)] ${className}`}>
        +{formatted}
      </span>
    );
  }
  if (type === "expense") {
    return (
      <span className={`tabular-nums text-[var(--ink)] ${className}`}>
        −{formatted}
      </span>
    );
  }
  return (
    <span className={`tabular-nums text-[var(--muted)] ${className}`}>
      {formatted}
    </span>
  );
}
