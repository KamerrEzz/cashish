"use client";

import Link from "next/link";
import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  APP_NAV_MORE,
  APP_NAV_PRIMARY,
  isNavActive,
  type AppNavItem,
} from "@/lib/nav";

function NavLink({
  item,
  pathname,
  onNavigate,
}: {
  item: AppNavItem;
  pathname: string;
  onNavigate?: () => void;
}) {
  const active = isNavActive(
    pathname,
    item.href,
    "exact" in item ? item.exact : false,
  );
  return (
    <Link
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
}

function NavSections({
  pathname,
  onNavigate,
  className = "",
  compactPrimary = false,
}: {
  pathname: string;
  onNavigate?: () => void;
  className?: string;
  compactPrimary?: boolean;
}) {
  return (
    <div className={className}>
      <div
        className={
          compactPrimary
            ? "flex flex-wrap items-center gap-0.5"
            : "flex flex-col gap-1"
        }
      >
        {APP_NAV_PRIMARY.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            pathname={pathname}
            onNavigate={onNavigate}
          />
        ))}
      </div>
      <div className={compactPrimary ? "relative ml-1" : "mt-4"}>
        {compactPrimary ? (
          <details className="group relative">
            <summary className="cursor-pointer list-none rounded-lg px-3 py-2.5 text-[var(--muted)] hover:bg-[var(--wash)] hover:text-[var(--ink)] [&::-webkit-details-marker]:hidden">
              Más
            </summary>
            <div className="absolute right-0 z-40 mt-1 min-w-[12rem] rounded-xl border border-[var(--line)] bg-[var(--surface)] p-2 shadow-lg">
              {APP_NAV_MORE.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </details>
        ) : (
          <>
            <p className="mb-1 px-3 text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
              Más
            </p>
            <div className="flex flex-col gap-1">
              {APP_NAV_MORE.map((item) => (
                <NavLink
                  key={item.href}
                  item={item}
                  pathname={pathname}
                  onNavigate={onNavigate}
                />
              ))}
            </div>
          </>
        )}
      </div>
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
                <NavSections
                  pathname={pathname}
                  onNavigate={() => setOpen(false)}
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
        <NavSections pathname={pathname} compactPrimary />
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

      <div
        className="flex items-center gap-1 lg:hidden"
        data-testid="mobile-nav-trigger"
      >
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
