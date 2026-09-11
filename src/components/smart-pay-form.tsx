"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { payCreditCardSmart } from "@/app/actions/accounts";
import { SubmitButton } from "@/components/submit-button";
import { Field, inputClass, btnGhost, btnPrimary, Mxn } from "@/components/ui";

type Source = { id: string; name: string };
type PayMode = "minimum" | "avoid_interest" | "custom";

export function SmartPayForm({
  creditCardAccountId,
  sources,
  minimumCents,
  avoidInterestCents,
  initialMode,
}: {
  creditCardAccountId: string;
  sources: Source[];
  minimumCents: number;
  avoidInterestCents: number;
  initialMode?: "avoid_interest" | "minimum" | null;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [highlight, setHighlight] = useState<PayMode | null>(
    initialMode ?? null,
  );

  async function run(mode: PayMode, formData?: FormData) {
    setError(null);
    setOk(null);
    setHighlight(mode);
    const fd = formData ?? new FormData();
    if (!fd.get("fromAccountId") && sources[0]) {
      fd.set("fromAccountId", sources[0].id);
    }
    fd.set("creditCardAccountId", creditCardAccountId);
    fd.set("mode", mode);
    const result = await payCreditCardSmart(fd);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOk(result.message);
    router.refresh();
  }

  const ritual =
    initialMode === "avoid_interest"
      ? "Ritual de quincena: pago sugerido para evitar intereses."
      : initialMode === "minimum"
        ? "Ritual de quincena: pago mínimo del ciclo."
        : null;

  function modeClass(mode: PayMode) {
    const base = btnGhost;
    if (highlight === mode) {
      return `${btnPrimary} ring-2 ring-[var(--accent)]/40`;
    }
    return base;
  }

  return (
    <div className="space-y-3">
      {ritual ? (
        <p className="rounded-xl border border-[var(--accent)]/25 bg-[var(--accent-soft)]/50 px-3 py-2 text-sm text-[var(--accent-deep)]">
          {ritual}
        </p>
      ) : null}
      <form
        action={async (formData) => {
          await run("custom", formData);
        }}
        className="space-y-3"
      >
        <Field label="Desde">
          <select name="fromAccountId" required className={inputClass}>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={modeClass("minimum")}
            onClick={async () => {
              const fd = new FormData();
              const select = document.querySelector<HTMLSelectElement>(
                'select[name="fromAccountId"]',
              );
              if (select) fd.set("fromAccountId", select.value);
              await run("minimum", fd);
            }}
          >
            Pagar mínimo (<Mxn cents={minimumCents} />)
          </button>
          <button
            type="button"
            className={modeClass("avoid_interest")}
            onClick={async () => {
              const fd = new FormData();
              const select = document.querySelector<HTMLSelectElement>(
                'select[name="fromAccountId"]',
              );
              if (select) fd.set("fromAccountId", select.value);
              await run("avoid_interest", fd);
            }}
          >
            Sin intereses (<Mxn cents={avoidInterestCents} />)
          </button>
        </div>
        <Field label="Monto personalizado">
          <input name="amount" className={inputClass} placeholder="0.00" />
        </Field>
        <SubmitButton>Pagar monto</SubmitButton>
      </form>
      {error ? (
        <p className="text-sm text-[var(--danger-ink)]">{error}</p>
      ) : null}
      {ok ? (
        <div className="space-y-2">
          <p className="text-sm text-[var(--accent-deep)]">{ok}</p>
          <Link
            href="/app/quincena"
            className="inline-flex text-sm font-medium text-[var(--accent)] underline-offset-2 hover:underline"
          >
            Volver a tu quincena
          </Link>
        </div>
      ) : null}
    </div>
  );
}
