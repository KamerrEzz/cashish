import Link from "next/link";
import { btnPrimary, btnGhost } from "@/components/ui";
import { ThemeToggle } from "@/components/theme-toggle";

export default function HomePage() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-3xl items-center justify-between px-4 pt-6">
        <span className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--accent-deep)]">
          Cashish
        </span>
        <ThemeToggle />
      </header>
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-16">
        <p className="font-[family-name:var(--font-display)] text-5xl tracking-tight text-[var(--accent-deep)] md:text-6xl">
          Cashish
        </p>
        <h1 className="mt-4 max-w-xl text-2xl font-medium text-[var(--ink)] md:text-3xl">
          Finanzas personales con crédito de verdad.
        </h1>
        <p className="mt-4 max-w-lg text-[var(--muted)]">
          Liquidez, tarjetas con corte y pago, suscripciones, avisos y
          analíticas — un sistema claro, no un Excel disfrazado.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/login" className={btnPrimary}>
            Entrar
          </Link>
          <Link href="/docs/mcp" className={btnGhost}>
            Docs MCP
          </Link>
        </div>
      </main>
    </div>
  );
}
