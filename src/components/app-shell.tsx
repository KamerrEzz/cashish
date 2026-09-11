import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

const nav = [
  { href: "/app", label: "Inicio" },
  { href: "/app/accounts", label: "Cuentas" },
  { href: "/app/transactions", label: "Movimientos" },
  { href: "/app/subscriptions", label: "Suscripciones" },
  { href: "/app/reminders", label: "Recordatorios" },
];

export async function AppShell({ children }: { children: React.ReactNode }) {
  async function signOut() {
    "use server";
    const supabase = await createClient();
    await supabase.auth.signOut();
    redirect("/login");
  }

  return (
    <div className="min-h-full bg-[var(--wash)]">
      <header className="border-b border-[var(--line)] bg-[var(--surface)]/90 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-4 py-3">
          <Link
            href="/app"
            className="font-[family-name:var(--font-display)] text-xl font-semibold tracking-tight text-[var(--accent-deep)]"
          >
            Cashish
          </Link>
          <nav className="flex flex-wrap items-center gap-1 text-sm">
            {nav.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="rounded-lg px-2.5 py-1.5 text-[var(--muted)] hover:bg-[var(--wash)] hover:text-[var(--ink)]"
              >
                {item.label}
              </Link>
            ))}
            <form action={signOut}>
              <button
                type="submit"
                className="rounded-lg px-2.5 py-1.5 text-[var(--muted)] hover:bg-[var(--wash)] hover:text-[var(--ink)]"
              >
                Salir
              </button>
            </form>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-8">{children}</main>
    </div>
  );
}
