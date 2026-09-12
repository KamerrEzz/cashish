export function DocsCode({
  title,
  code,
}: {
  title?: string;
  language?: string;
  code: string;
}) {
  return (
    <figure className="my-6 overflow-hidden rounded-[var(--radius)] border border-[var(--line)] bg-[var(--wash)]">
      {title ? (
        <figcaption className="border-b border-[var(--line)] px-4 py-2 text-xs font-medium text-[var(--muted)]">
          {title}
        </figcaption>
      ) : null}
      <pre className="overflow-x-auto p-4 text-[13px] leading-relaxed text-[var(--ink)]">
        <code>{code}</code>
      </pre>
    </figure>
  );
}
