import Link from "next/link";
import { btnPrimary, btnGhost } from "@/components/ui";

export default function HomePage() {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-4 py-20">
        <p className="font-[family-name:var(--font-display)] text-5xl tracking-tight text-[var(--accent-deep)] md:text-6xl">
          Cashish
        </p>
        <h1 className="mt-4 max-w-xl text-2xl font-medium text-[var(--ink)] md:text-3xl">
          Tu crédito, con corte y pago de verdad.
        </h1>
        <p className="mt-4 max-w-lg text-[var(--muted)]">
          Deja de tratar la tarjeta como débito. Registra cargos, cierra
          estados de cuenta, paga con transferencia vinculada y no olvides qué
          tarjeta usa Netflix.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/login" className={btnPrimary}>
            Entrar
          </Link>
          <Link href="/login" className={btnGhost}>
            Crear cuenta
          </Link>
        </div>
      </main>
    </div>
  );
}
