"use client";

import Link from "next/link";
import { useEffect } from "react";
import { btnPrimary, btnGhost } from "@/components/ui";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto max-w-lg space-y-4 py-12 text-center">
      <h1 className="font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
        Algo salió mal
      </h1>
      <p className="text-sm text-[var(--muted)]">
        No pudimos cargar esta vista. Puedes reintentar o volver al inicio.
      </p>
      <div className="flex flex-wrap justify-center gap-3">
        <button type="button" className={btnPrimary} onClick={reset}>
          Reintentar
        </button>
        <Link href="/app" className={btnGhost}>
          Ir al inicio
        </Link>
      </div>
    </div>
  );
}
