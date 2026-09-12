import type { DocsCalloutKind } from "@/lib/docs/types";

const styles: Record<DocsCalloutKind, string> = {
  note: "border-[var(--accent)]/40 bg-[var(--accent-soft)]/50",
  tip: "border-[var(--positive)]/45 bg-[color-mix(in_srgb,var(--positive)_12%,transparent)]",
  warn: "border-[var(--warn)]/50 bg-[var(--warn-soft)]",
};

const titles: Record<DocsCalloutKind, string> = {
  note: "Nota",
  tip: "Tip",
  warn: "Cuidado",
};

export function DocsCallout({
  kind,
  title,
  text,
}: {
  kind: DocsCalloutKind;
  title?: string;
  text: string;
}) {
  return (
    <aside
      className={`my-6 border-l-[3px] py-3 pl-4 pr-3 ${styles[kind]}`}
      role="note"
    >
      <p className="text-sm font-semibold text-[var(--ink)]">
        {title ?? titles[kind]}
      </p>
      <p className="mt-1 text-sm leading-relaxed text-[var(--muted)]">{text}</p>
    </aside>
  );
}
