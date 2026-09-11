"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  createSubscription,
  toggleSubscription,
  updateSubscription,
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
  const [editingId, setEditingId] = useState<string | null>(null);

  async function onCreate(formData: FormData) {
    setError(null);
    const result = await createSubscription(formData);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function onUpdate(formData: FormData) {
    setError(null);
    const result = await updateSubscription(formData);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setEditingId(null);
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
        <h2 className="font-[family-name:var(--font-display)] text-lg">
          Nueva suscripción
        </h2>
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
        {error ? (
          <p className="text-sm text-[var(--danger-ink)]">{error}</p>
        ) : null}
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
            {editingId === s.id ? (
              <form action={onUpdate} className="space-y-2">
                <input type="hidden" name="id" value={s.id} />
                <Field label="Nombre">
                  <input
                    name="name"
                    required
                    className={inputClass}
                    defaultValue={s.name}
                  />
                </Field>
                <Field label="Comercio">
                  <input
                    name="merchant"
                    required
                    className={inputClass}
                    defaultValue={s.merchant}
                  />
                </Field>
                <Field label="Cuenta">
                  <select
                    name="accountId"
                    required
                    className={inputClass}
                    defaultValue={s.account_id}
                  >
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
                    defaultValue={(s.amount_cents / 100).toFixed(2)}
                  />
                </Field>
                <Field label="Frecuencia">
                  <select
                    name="frequency"
                    className={inputClass}
                    defaultValue={s.frequency}
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
                    defaultValue={s.next_billing_on}
                  />
                </Field>
                <Field label="Notas">
                  <input
                    name="notes"
                    className={inputClass}
                    defaultValue={s.notes ?? ""}
                  />
                </Field>
                <div className="flex flex-wrap gap-2">
                  <SubmitButton>Actualizar</SubmitButton>
                  <button
                    type="button"
                    className={btnGhost}
                    onClick={() => setEditingId(null)}
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            ) : (
              <>
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
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className={btnGhost}
                    onClick={() => onToggle(s.id, !s.is_active)}
                  >
                    {s.is_active ? "Pausar" : "Reactivar"}
                  </button>
                  <button
                    type="button"
                    className={btnGhost}
                    onClick={() => setEditingId(s.id)}
                  >
                    Editar
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
