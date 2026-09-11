"use client";

import { useState } from "react";
import { createTransaction } from "@/app/actions/transactions";
import { createLinkedTransfer } from "@/app/actions/transfers";
import { SubmitButton } from "@/components/submit-button";
import { Field, inputClass } from "@/components/ui";
import { todayMexico } from "@/lib/credit-cycle";
import type { Account } from "@/lib/database.types";

export function TransactionForms({ accounts }: { accounts: Account[] }) {
  const [mode, setMode] = useState<"expense" | "income" | "transfer">("expense");
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function onTx(formData: FormData) {
    setError(null);
    setOk(false);
    formData.set("type", mode === "transfer" ? "expense" : mode);
    if (mode === "transfer") {
      const result = await createLinkedTransfer(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
    } else {
      const result = await createTransaction(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
    }
    setOk(true);
  }

  const liquid = accounts.filter((a) => a.type !== "credit_card");
  const cards = accounts.filter((a) => a.type === "credit_card");

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(
          [
            ["expense", "Gasto"],
            ["income", "Ingreso"],
            ["transfer", "Pago / transferencia"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setMode(value)}
            className={`rounded-lg px-3 py-1.5 text-sm ${
              mode === value
                ? "bg-[var(--accent)] text-white"
                : "bg-[var(--wash)] text-[var(--muted)]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <form action={onTx} className="space-y-3">
        <input type="hidden" name="occurredOn" value={todayMexico()} />
        {mode === "transfer" ? (
          <>
            <Field label="Desde (débito/efectivo)">
              <select name="fromAccountId" required className={inputClass}>
                {liquid.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Hacia (tarjeta u otra)">
              <select name="toAccountId" required className={inputClass}>
                {[...cards, ...liquid].map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Nota">
              <input name="note" className={inputClass} defaultValue="Transferencia" />
            </Field>
          </>
        ) : (
          <Field label="Cuenta">
            <select name="accountId" required className={inputClass}>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </Field>
        )}
        <Field label="Monto">
          <input name="amount" required className={inputClass} placeholder="0.00" />
        </Field>
        {mode !== "transfer" ? (
          <>
            <Field label="Comercio">
              <input name="merchant" className={inputClass} placeholder="Netflix" />
            </Field>
            <Field label="Descripción">
              <input name="description" className={inputClass} />
            </Field>
            <Field label="Categoría">
              <input name="category" className={inputClass} placeholder="Suscripciones" />
            </Field>
          </>
        ) : null}
        {error ? <p className="text-sm text-red-700">{error}</p> : null}
        {ok ? (
          <p className="text-sm text-[var(--accent-deep)]">Guardado.</p>
        ) : null}
        <SubmitButton>Registrar</SubmitButton>
      </form>
    </div>
  );
}
