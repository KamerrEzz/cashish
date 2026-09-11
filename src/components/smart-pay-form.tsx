"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { payCreditCardSmart } from "@/app/actions/accounts";
import { SubmitButton } from "@/components/submit-button";
import { Field, inputClass, btnGhost, Mxn } from "@/components/ui";

type Source = { id: string; name: string };

export function SmartPayForm({
  creditCardAccountId,
  sources,
  minimumCents,
  avoidInterestCents,
}: {
  creditCardAccountId: string;
  sources: Source[];
  minimumCents: number;
  avoidInterestCents: number;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);

  async function run(mode: "minimum" | "avoid_interest" | "custom", formData?: FormData) {
    setError(null);
    setOk(null);
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

  return (
    <div className="space-y-3">
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
            className={btnGhost}
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
            className={btnGhost}
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
        <p className="text-sm text-[var(--accent-deep)]">{ok}</p>
      ) : null}
    </div>
  );
}
