"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import { APP_NAV, isNavActive } from "@/lib/nav";

function NavLinks({
  pathname,
  onNavigate,
  className = "",
}: {
  pathname: string;
  onNavigate?: () => void;
  className?: string;
}) {
  return (
    <div className={className}>
      {APP_NAV.map((item) => {
        const active = isNavActive(
          pathname,
          item.href,
          "exact" in item ? item.exact : false,
        );
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            onClick={onNavigate}
            className={
              active
                ? "rounded-lg bg-[var(--accent-soft)] px-3 py-2.5 font-medium text-[var(--accent-deep)]"
                : "rounded-lg px-3 py-2.5 text-[var(--muted)] transition-colors hover:bg-[var(--wash)] hover:text-[var(--ink)]"
            }
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}

export function AppNav({ signOut }: { signOut: () => Promise<void> }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const panelId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const drawer =
    mounted && open
      ? createPortal(
          <div
            className="fixed inset-0 z-[100] lg:hidden"
            role="dialog"
            aria-modal="true"
            aria-labelledby={`${panelId}-title`}
            data-testid="mobile-nav-overlay"
          >
            <button
              type="button"
              aria-label="Cerrar menú"
              className="absolute inset-0 bg-black/50"
              onClick={() => setOpen(false)}
              data-testid="mobile-nav-backdrop"
            />
            <div
              id={panelId}
              data-testid="mobile-nav-drawer"
              className="absolute inset-y-0 right-0 flex w-[min(20rem,100%)] max-w-full flex-col bg-[var(--surface)] shadow-2xl"
            >
              <div className="flex shrink-0 items-center justify-between border-b border-[var(--line)] px-4 py-3">
                <span
                  id={`${panelId}-title`}
                  className="font-[family-name:var(--font-display)] text-lg text-[var(--accent-deep)]"
                >
                  Menú
                </span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-2.5 py-1.5 text-sm text-[var(--muted)] hover:bg-[var(--wash)] hover:text-[var(--ink)]"
                  data-testid="mobile-nav-close"
                >
                  Cerrar
                </button>
              </div>
              <nav
                className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto p-3 text-sm"
                aria-label="Navegación principal"
              >
                <NavLinks
                  pathname={pathname}
                  onNavigate={() => setOpen(false)}
                  className="flex flex-col gap-1"
                />
              </nav>
              <form
                action={signOut}
                className="shrink-0 border-t border-[var(--line)] p-3"
              >
                <button
                  type="submit"
                  className="w-full rounded-xl border border-[var(--line)] bg-[var(--wash)] px-3 py-2.5 text-sm font-medium text-[var(--ink)] hover:bg-[var(--accent-soft)]"
                  data-testid="mobile-nav-signout"
                >
                  Salir
                </button>
              </form>
            </div>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      <nav
        className="hidden items-center gap-0.5 text-sm lg:flex"
        aria-label="Navegación principal"
        data-testid="desktop-nav"
      >
        <NavLinks
          pathname={pathname}
          className="flex flex-wrap items-center gap-0.5"
        />
        <ThemeToggle compact />
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-lg px-2.5 py-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--wash)] hover:text-[var(--ink)]"
          >
            Salir
          </button>
        </form>
      </nav>

      <div className="flex items-center gap-1 lg:hidden" data-testid="mobile-nav-trigger">
        <ThemeToggle compact />
        <button
          type="button"
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex size-10 items-center justify-center rounded-lg text-[var(--ink)] hover:bg-[var(--wash)]"
          data-testid="mobile-nav-toggle"
        >
          <span aria-hidden className="relative block size-4">
            <span
              className={`absolute left-0 block h-0.5 w-4 bg-current transition ${open ? "top-1.5 rotate-45" : "top-0.5"}`}
            />
            <span
              className={`absolute left-0 top-1.5 block h-0.5 w-4 bg-current transition ${open ? "opacity-0" : ""}`}
            />
            <span
              className={`absolute left-0 block h-0.5 w-4 bg-current transition ${open ? "top-1.5 -rotate-45" : "top-2.5"}`}
            />
          </span>
        </button>
      </div>

      {drawer}
    </>
  );
}
