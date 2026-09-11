"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  createSubscription,
  toggleSubscription,
} from "@/app/actions/subscriptions";
import { SubmitButton } from "@/components/submit-button";
import { Field, inputClass, btnGhost, Mxn } from "@/components/ui";
import { todayMexico } from "@/lib/credit-cycle";
import type { Account, Subscription } from "@/lib/database.types";

type SubRow = Subscription & { accounts?: { name: string } | null };

export function SubscriptionManager({
  accounts,
  subscriptions,
}: {
  accounts: Account[];
  subscriptions: SubRow[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function onCreate(formData: FormData) {
    setError(null);
    const result = await createSubscription(formData);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function onToggle(id: string, isActive: boolean) {
    await toggleSubscription(id, isActive);
    router.refresh();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <form
        action={onCreate}
        className="space-y-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5"
      >
        <h2 className="font-semibold">Nueva suscripción</h2>
        <Field label="Nombre">
          <input
            name="name"
            required
            className={inputClass}
            placeholder="Netflix"
          />
        </Field>
        <Field label="Comercio">
          <input
            name="merchant"
            required
            className={inputClass}
            placeholder="NETFLIX.COM"
          />
        </Field>
        <Field label="Tarjeta / cuenta que cobra">
          <select name="accountId" required className={inputClass}>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Monto">
          <input
            name="amount"
            required
            className={inputClass}
            placeholder="229.00"
          />
        </Field>
        <Field label="Frecuencia">
          <select
            name="frequency"
            className={inputClass}
            defaultValue="monthly"
          >
            <option value="weekly">Semanal</option>
            <option value="monthly">Mensual</option>
            <option value="yearly">Anual</option>
          </select>
        </Field>
        <Field label="Próximo cobro">
          <input
            type="date"
            name="nextBillingOn"
            required
            className={inputClass}
            defaultValue={todayMexico()}
          />
        </Field>
        <Field label="Notas">
          <input name="notes" className={inputClass} />
        </Field>
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        <SubmitButton>Guardar</SubmitButton>
      </form>

      <div className="space-y-3">
        {subscriptions.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            Sin suscripciones. Agrega las que cobren tus tarjetas.
          </p>
        ) : null}
        {subscriptions.map((s) => (
          <div
            key={s.id}
            className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4"
          >
            <div className="flex justify-between gap-2">
              <div>
                <p className="font-semibold">{s.name}</p>
                <p className="text-xs text-[var(--muted)]">
                  {s.merchant} · {s.accounts?.name ?? "—"} · próximo{" "}
                  {s.next_billing_on}
                  {!s.is_active ? " · pausada" : ""}
                </p>
              </div>
              <Mxn cents={s.amount_cents} className="font-medium tabular-nums" />
            </div>
            <button
              type="button"
              className={`${btnGhost} mt-3`}
              onClick={() => onToggle(s.id, !s.is_active)}
            >
              {s.is_active ? "Pausar" : "Reactivar"}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
