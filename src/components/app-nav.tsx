"use client";

import Link from "next/link";
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

export function AppNav({ signOut }: { signOut: () => Promise<void> }) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-wrap items-center gap-0.5 text-sm">
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
            className={
              active
                ? "rounded-lg bg-[var(--accent-soft)] px-2.5 py-1.5 font-medium text-[var(--accent-deep)]"
                : "rounded-lg px-2.5 py-1.5 text-[var(--muted)] transition-colors hover:bg-[var(--wash)] hover:text-[var(--ink)]"
            }
          >
            {item.label}
          </Link>
        );
      })}
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
  );
}
