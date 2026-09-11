import Link from "next/link";

export function AiSidebar({
  conversations,
  activeId,
}: {
  conversations: { id: string; title: string | null; updated_at: string }[];
  activeId: string | null;
}) {
  return (
    <aside className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-3 sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <p className="text-sm font-semibold text-[var(--ink)]">Hilos</p>
        <Link
          href="/app/ai"
          className="text-xs font-medium text-[var(--accent)] hover:underline"
        >
          Nuevo
        </Link>
      </div>
      {conversations.length === 0 ? (
        <p className="text-xs text-[var(--muted)]">Aún no hay conversaciones.</p>
      ) : (
        <ul className="max-h-64 space-y-1 overflow-y-auto sm:max-h-[28rem]">
          {conversations.map((c) => (
            <li key={c.id}>
              <Link
                href={`/app/ai/${c.id}`}
                className={`block truncate rounded-lg px-2.5 py-2 text-sm ${
                  activeId === c.id
                    ? "bg-[var(--accent-soft)] font-medium text-[var(--accent-deep)]"
                    : "text-[var(--muted)] hover:bg-[var(--wash)] hover:text-[var(--ink)]"
                }`}
              >
                {c.title || "Sin título"}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </aside>
  );
}
