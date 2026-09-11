"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  suggestSubscriptions,
  createSubscription,
  type SubscriptionSuggestion,
} from "@/app/actions/subscriptions";
import { SubmitButton } from "@/components/submit-button";
import { btnGhost, btnPrimary, Field, inputClass, Mxn } from "@/components/ui";
import { todayMexico } from "@/lib/credit-cycle";

type AccountOption = { id: string; name: string };

export function SubscriptionSuggestions({
  accounts,
}: {
  accounts: AccountOption[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [items, setItems] = useState<SubscriptionSuggestion[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  function load() {
    startTransition(async () => {
      setError(null);
      const result = await suggestSubscriptions();
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setItems(result.suggestions);
    });
  }

  async function addSuggestion(s: SubscriptionSuggestion, formData: FormData) {
    formData.set("name", s.merchantSample);
    formData.set("merchant", s.merchantSample);
    formData.set("amount", (s.avgCents / 100).toFixed(2));
    formData.set("frequency", "monthly");
    formData.set("nextBillingOn", s.lastOccurredOn || todayMexico());
    const result = await createSubscription(formData);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
    load();
  }

  return (
    <div className="space-y-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="font-[family-name:var(--font-display)] text-lg">
            Sugerencias
          </h2>
          <p className="text-sm text-[var(--muted)]">
            Comercios con cargos parecidos en los últimos meses
          </p>
        </div>
        <button type="button" className={btnPrimary} onClick={load} disabled={pending}>
          {pending ? "Buscando…" : "Detectar"}
        </button>
      </div>
      {error ? (
        <p className="text-sm text-[var(--danger-ink)]">{error}</p>
      ) : null}
      {items && items.length === 0 ? (
        <p className="text-sm text-[var(--muted)]">
          No hay patrones claros todavía.
        </p>
      ) : null}
      <ul className="space-y-3">
        {(items ?? []).map((s) => (
          <li
            key={s.merchantKey}
            className="flex flex-col gap-2 border-b border-[var(--line)] pb-3 last:border-0 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <p className="font-medium text-[var(--ink)]">{s.merchantSample}</p>
              <p className="text-xs text-[var(--muted)]">
                {s.count} cargos · avg <Mxn cents={s.avgCents} /> · último{" "}
                {s.lastOccurredOn}
                {s.alreadyTracked ? " · ya registrada" : ""}
              </p>
            </div>
            {!s.alreadyTracked ? (
              <form
                action={async (fd) => {
                  await addSuggestion(s, fd);
                }}
                className="flex flex-wrap items-end gap-2"
              >
                <Field label="Cuenta">
                  <select name="accountId" required className={inputClass}>
                    {accounts.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <SubmitButton className={btnGhost}>Agregar</SubmitButton>
              </form>
            ) : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
