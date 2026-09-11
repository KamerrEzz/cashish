"use client";

import Link from "next/link";
import { AppNav } from "@/components/app-nav";

export default function NavHarnessPage() {
  if (process.env.NEXT_PUBLIC_E2E_HARNESS !== "1") {
    return (
      <main className="min-h-dvh p-8 text-[var(--muted)]">
        <p>Not found</p>
      </main>
    );
  }

  return (
    <div className="min-h-dvh bg-[var(--wash)]">
      <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[var(--surface)]/95 backdrop-blur-md">
        <div className="relative z-10 mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
          <Link
            href="/app"
            className="font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--accent-deep)]"
          >
            Cashish
          </Link>
          <AppNav signOut={async () => undefined} />
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-4 py-8">
        <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
          Harness de navegación
        </h1>
        <p className="mt-2 text-[var(--muted)]">
          Página solo para pruebas E2E del menú móvil.
        </p>
      </main>
    </div>
  );
}
