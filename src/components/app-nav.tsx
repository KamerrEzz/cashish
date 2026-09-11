"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";
import {
  APP_NAV_MORE,
  APP_NAV_PRIMARY,
  isNavActive,
  type AppNavItem,
} from "@/lib/nav";

function linkClass(active: boolean, dense = false) {
  const pad = dense ? "px-2.5 py-1.5" : "px-3 py-2";
  if (active) {
    return `${pad} rounded-md text-[var(--accent-deep)] font-medium bg-[var(--accent-soft)]`;
  }
  return `${pad} rounded-md text-[var(--muted)] hover:text-[var(--ink)] hover:bg-[var(--wash)] transition-colors`;
}

function NavLink({
  item,
  pathname,
  onNavigate,
  dense,
}: {
  item: AppNavItem;
  pathname: string;
  onNavigate?: () => void;
  dense?: boolean;
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
      className={linkClass(active, dense)}
    >
      {item.label}
    </Link>
  );
}

function MoreMenu({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const moreActive = APP_NAV_MORE.some((item) =>
    isNavActive(pathname, item.href),
  );

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="relative" ref={rootRef}>
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="menu"
        onClick={() => setOpen((v) => !v)}
        className={linkClass(moreActive || open, true)}
      >
        Más
        <span aria-hidden className="ml-1 opacity-60">
          ▾
        </span>
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-1.5 min-w-[11.5rem] overflow-hidden rounded-[var(--radius)] border border-[var(--line)] bg-[var(--surface)] py-1 shadow-[var(--shadow)]"
        >
          {APP_NAV_MORE.map((item) => (
            <Link
              key={item.href}
              role="menuitem"
              href={item.href}
              onClick={() => {
                setOpen(false);
                onNavigate?.();
              }}
              className={`block px-3 py-2 text-sm ${
                isNavActive(pathname, item.href)
                  ? "bg-[var(--accent-soft)] font-medium text-[var(--accent-deep)]"
                  : "text-[var(--ink)] hover:bg-[var(--wash)]"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </div>
      ) : null}
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
              className="absolute inset-0 bg-black/40"
              onClick={() => setOpen(false)}
              data-testid="mobile-nav-backdrop"
            />
            <div
              id={panelId}
              data-testid="mobile-nav-drawer"
              className="absolute inset-y-0 right-0 flex w-[min(19rem,100%)] max-w-full flex-col border-l border-[var(--line)] bg-[var(--surface)] shadow-[var(--shadow)]"
            >
              <div className="flex shrink-0 items-center justify-between border-b border-[var(--line)] px-4 py-3.5">
                <span
                  id={`${panelId}-title`}
                  className="font-[family-name:var(--font-display)] text-lg text-[var(--ink)]"
                >
                  Menú
                </span>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md px-2.5 py-1.5 text-sm text-[var(--muted)] hover:bg-[var(--wash)] hover:text-[var(--ink)]"
                  data-testid="mobile-nav-close"
                >
                  Cerrar
                </button>
              </div>
              <nav
                className="flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto p-3 text-sm"
                aria-label="Navegación principal"
              >
                {APP_NAV_PRIMARY.map((item) => (
                  <NavLink
                    key={item.href}
                    item={item}
                    pathname={pathname}
                    onNavigate={() => setOpen(false)}
                  />
                ))}
                <div className="my-3 border-t border-[var(--line)]" />
                <p className="px-3 pb-1 text-[11px] font-medium tracking-wide text-[var(--muted)]">
                  Herramientas
                </p>
                {APP_NAV_MORE.map((item) => (
                  <NavLink
                    key={item.href}
                    item={item}
                    pathname={pathname}
                    onNavigate={() => setOpen(false)}
                  />
                ))}
              </nav>
              <form
                action={signOut}
                className="shrink-0 border-t border-[var(--line)] p-3"
              >
                <button
                  type="submit"
                  className="w-full rounded-[var(--radius)] border border-[var(--line)] bg-[var(--wash)] px-3 py-2.5 text-sm font-medium text-[var(--ink)] hover:bg-[var(--accent-soft)]"
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
        className="hidden items-center gap-0.5 text-[13px] lg:flex"
        aria-label="Navegación principal"
        data-testid="desktop-nav"
      >
        {APP_NAV_PRIMARY.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} dense />
        ))}
        <MoreMenu pathname={pathname} />
        <div className="mx-1 h-4 w-px bg-[var(--line)]" aria-hidden />
        <ThemeToggle compact />
        <form action={signOut}>
          <button
            type="submit"
            className="rounded-md px-2.5 py-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--wash)] hover:text-[var(--ink)]"
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
          className="inline-flex size-10 items-center justify-center rounded-md text-[var(--ink)] hover:bg-[var(--wash)]"
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
