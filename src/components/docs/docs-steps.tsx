export function DocsSteps({
  title,
  items,
}: {
  title?: string;
  items: string[];
}) {
  return (
    <div className="my-6">
      {title ? (
        <p className="mb-3 text-sm font-semibold text-[var(--ink)]">{title}</p>
      ) : null}
      <ol className="space-y-3">
        {items.map((item, i) => (
          <li key={i} className="flex gap-3 text-sm leading-relaxed">
            <span
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[var(--accent-soft)] font-[family-name:var(--font-display)] text-xs font-semibold text-[var(--accent-deep)]"
              aria-hidden
            >
              {i + 1}
            </span>
            <span className="text-[var(--muted)]">{item}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
