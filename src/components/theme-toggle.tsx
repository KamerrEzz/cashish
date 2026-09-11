"use client";

import { useTheme, type ThemePreference } from "@/components/theme-provider";

const labels: Record<ThemePreference, string> = {
  light: "Claro",
  dark: "Oscuro",
  system: "Sistema",
};

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { preference, resolved, cycle } = useTheme();

  return (
    <button
      type="button"
      onClick={cycle}
      title={`Tema: ${labels[preference]} (clic para cambiar)`}
      aria-label={`Cambiar tema. Actual: ${labels[preference]}, resuelto ${resolved}`}
      className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--wash)] hover:text-[var(--ink)]"
    >
      <span aria-hidden className="text-base leading-none">
        {resolved === "dark" ? "◐" : "◑"}
      </span>
      {compact ? null : (
        <span className="text-sm">{labels[preference]}</span>
      )}
    </button>
  );
}
