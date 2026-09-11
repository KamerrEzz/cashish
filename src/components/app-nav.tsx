"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { ThemeToggle } from "@/components/theme-toggle";

const nav = [
  { href: "/app", label: "Inicio", exact: true },
  { href: "/app/accounts", label: "Cuentas" },
  { href: "/app/transactions", label: "Movimientos" },
  { href: "/app/analytics", label: "Analíticas" },
  { href: "/app/subscriptions", label: "Suscripciones" },
  { href: "/app/reminders", label: "Avisos" },
  { href: "/app/agents", label: "Agentes" },
] as const;

function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

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
      {nav.map((item) => {
        const active = isActive(
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
                ? "rounded-lg bg-[var(--accent-soft)] px-3 py-2 font-medium text-[var(--accent-deep)]"
                : "rounded-lg px-3 py-2 text-[var(--muted)] transition-colors hover:bg-[var(--wash)] hover:text-[var(--ink)]"
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

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  return (
    <>
      {/* Desktop */}
      <nav className="hidden items-center gap-0.5 text-sm lg:flex">
        <NavLinks pathname={pathname} className="flex flex-wrap items-center gap-0.5" />
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

      {/* Mobile / tablet controls */}
      <div className="flex items-center gap-1 lg:hidden">
        <ThemeToggle compact />
        <button
          type="button"
          aria-expanded={open}
          aria-controls="app-mobile-nav"
          aria-label={open ? "Cerrar menú" : "Abrir menú"}
          onClick={() => setOpen((v) => !v)}
          className="inline-flex size-10 items-center justify-center rounded-lg text-[var(--ink)] hover:bg-[var(--wash)]"
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

      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Cerrar menú"
            className="absolute inset-0 bg-[var(--ink)]/40"
            onClick={() => setOpen(false)}
          />
          <div
            id="app-mobile-nav"
            className="absolute right-0 top-0 flex h-full w-[min(20rem,88vw)] flex-col border-l border-[var(--line)] bg-[var(--surface)] shadow-xl"
          >
            <div className="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
              <span className="font-[family-name:var(--font-display)] text-lg text-[var(--accent-deep)]">
                Menú
              </span>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-lg px-2 py-1 text-sm text-[var(--muted)] hover:bg-[var(--wash)]"
              >
                Cerrar
              </button>
            </div>
            <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3 text-sm">
              <NavLinks
                pathname={pathname}
                onNavigate={() => setOpen(false)}
                className="flex flex-col gap-1"
              />
            </nav>
            <form action={signOut} className="border-t border-[var(--line)] p-3">
              <button
                type="submit"
                className="w-full rounded-xl border border-[var(--line)] px-3 py-2.5 text-sm text-[var(--muted)] hover:bg-[var(--wash)] hover:text-[var(--ink)]"
              >
                Salir
              </button>
            </form>
          </div>
        </div>
      ) : null}
    </>
  );
}
