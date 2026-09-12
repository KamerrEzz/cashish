"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { DOCS_NAV, DOCS_SECTIONS } from "@/lib/docs/nav";
import { btnGhost } from "@/components/ui";
import { ThemeToggle } from "@/components/theme-toggle";

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-8" aria-label="Documentación">
      {DOCS_SECTIONS.map((section) => {
        const items = DOCS_NAV.filter((i) => i.section === section.id);
        return (
          <div key={section.id}>
            <p className="px-2 text-xs font-semibold tracking-wide text-[var(--muted)]">
              {section.title}
            </p>
            <ul className="mt-2 space-y-0.5">
              {items.map((item) => {
                const active =
                  pathname === item.href ||
                  (item.href !== "/docs" && pathname.startsWith(item.href));
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      className={`group relative block rounded-md px-2 py-1.5 text-sm transition-colors ${
                        active
                          ? "bg-[var(--accent-soft)] font-medium text-[var(--accent-deep)]"
                          : "text-[var(--muted)] hover:bg-[var(--wash)] hover:text-[var(--ink)]"
                      }`}
                    >
                      <span
                        className={`absolute inset-y-1.5 left-0 w-[3px] rounded-full transition-opacity ${
                          active
                            ? "bg-[var(--accent)] opacity-100"
                            : "opacity-0 group-hover:opacity-40 group-hover:bg-[var(--accent)]"
                        }`}
                        aria-hidden
                      />
                      {item.title}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

export function DocsShell({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  return (
    <div className="min-h-full bg-[var(--wash)]">
      <header className="sticky top-0 z-30 border-b border-[var(--line)] bg-[var(--header)] backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              type="button"
              className="inline-flex items-center justify-center rounded-lg border border-[var(--line)] bg-[var(--surface)] px-2.5 py-1.5 text-sm text-[var(--ink)] lg:hidden"
              aria-expanded={open}
              aria-controls="docs-sidebar"
              onClick={() => setOpen((v) => !v)}
            >
              Menú
            </button>
            <Link
              href="/"
              className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--accent-deep)]"
            >
              Cashish
            </Link>
            <span className="hidden text-[var(--line)] sm:inline" aria-hidden>
              /
            </span>
            <Link
              href="/docs"
              className="hidden text-sm text-[var(--muted)] transition-colors hover:text-[var(--ink)] sm:inline"
            >
              Documentación
            </Link>
          </div>
          <div className="flex items-center gap-1">
            <ThemeToggle compact />
            <Link href="/login" className={btnGhost}>
              Entrar
            </Link>
          </div>
        </div>
      </header>

      <div className="mx-auto flex max-w-6xl gap-0 px-4 sm:px-6 lg:gap-10">
        {open ? (
          <button
            type="button"
            className="fixed inset-0 z-20 bg-[var(--ink)]/30 lg:hidden"
            aria-label="Cerrar menú"
            onClick={() => setOpen(false)}
          />
        ) : null}

        <aside
          id="docs-sidebar"
          className={`fixed inset-y-0 left-0 z-30 w-72 overflow-y-auto border-r border-[var(--line)] bg-[var(--surface)] px-4 py-6 pt-20 transition-transform lg:sticky lg:top-[3.25rem] lg:z-0 lg:h-[calc(100vh-3.25rem)] lg:w-56 lg:shrink-0 lg:translate-x-0 lg:border-0 lg:bg-transparent lg:px-0 lg:pt-8 ${
            open ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <NavLinks onNavigate={() => setOpen(false)} />
        </aside>

        <main className="min-w-0 flex-1 py-8 sm:py-10 lg:py-12">{children}</main>
      </div>
    </div>
  );
}
