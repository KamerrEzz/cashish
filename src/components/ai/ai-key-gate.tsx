import Link from "next/link";
import { btnPrimary } from "@/components/ui";

export function AiKeyGate() {
  return (
    <div className="flex min-h-[20rem] items-center justify-center rounded-2xl border border-[var(--line)] bg-[var(--surface)] px-4 py-10 text-center sm:px-8">
      <div className="max-w-md">
        <h2 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
          Falta tu clave de modelo
        </h2>
        <p className="mt-3 text-sm leading-relaxed text-[var(--muted)]">
          El asistente usa tu propia API (BYOK). Configúrala en Agentes — es distinta de
          las claves MCP para Cursor u otros agentes.
        </p>
        <Link href="/app/agents" className={`${btnPrimary} mt-6 inline-flex`}>
          Ir a Agentes
        </Link>
      </div>
    </div>
  );
}
