"use client";

import { useState } from "react";
import {
  applyReceipt,
  uploadReceipt,
  type ParsedReceiptDraft,
} from "@/app/actions/receipts";
import { SubmitButton } from "@/components/submit-button";
import { Field, inputClass, btnPrimary } from "@/components/ui";
import { todayMexico } from "@/lib/credit-cycle";
import type { Account } from "@/lib/database.types";

export function ReceiptUpload({ accounts }: { accounts: Account[] }) {
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [receiptId, setReceiptId] = useState<string | null>(null);
  const [draft, setDraft] = useState<ParsedReceiptDraft | null>(null);
  const [applied, setApplied] = useState(false);

  async function onUpload(formData: FormData) {
    setError(null);
    setApplied(false);
    setBusy(true);
    try {
      const result = await uploadReceipt(formData);
      if (!result.ok) {
        setError(result.error);
        setDraft(null);
        setReceiptId(null);
        return;
      }
      setReceiptId(result.receiptId);
      setDraft(result.parsed);
    } finally {
      setBusy(false);
    }
  }

  async function onApply(formData: FormData) {
    setError(null);
    const result = await applyReceipt(formData);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setApplied(true);
    setDraft(null);
    setReceiptId(null);
  }

  return (
    <div className="space-y-4">
      <form action={onUpload} className="space-y-3">
        <Field label="Foto o PDF del ticket">
          <input
            type="file"
            name="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            required
            className={inputClass}
            disabled={busy}
          />
        </Field>
        <p className="text-xs text-[var(--muted)]">
          Usa tu clave BYOK en Agentes. Revisas el borrador antes de registrar el
          movimiento.
        </p>
        <button type="submit" className={btnPrimary} disabled={busy}>
          {busy ? "Leyendo ticket…" : "Subir y leer"}
        </button>
      </form>

      {draft && receiptId ? (
        <form action={onApply} className="space-y-3 border-t border-[var(--line)] pt-4">
          <input type="hidden" name="receiptId" value={receiptId} />
          <p className="text-sm font-medium text-[var(--ink)]">
            Borrador del ticket — confirma o ajusta
          </p>
          <Field label="Cuenta">
            <select name="accountId" required className={inputClass} defaultValue={accounts[0]?.id}>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Tipo">
            <select name="type" className={inputClass} defaultValue={draft.type}>
              <option value="expense">Gasto</option>
              <option value="income">Ingreso</option>
            </select>
          </Field>
          <Field label="Fecha">
            <input
              type="date"
              name="occurredOn"
              required
              className={inputClass}
              defaultValue={draft.occurredOn || todayMexico()}
            />
          </Field>
          <Field label="Monto">
            <input
              name="amount"
              required
              className={inputClass}
              defaultValue={draft.amount}
            />
          </Field>
          <Field label="Comercio">
            <input
              name="merchant"
              className={inputClass}
              defaultValue={draft.merchant ?? ""}
            />
          </Field>
          <Field label="Descripción">
            <input
              name="description"
              className={inputClass}
              defaultValue={draft.description ?? ""}
            />
          </Field>
          <Field label="Categoría">
            <input
              name="category"
              className={inputClass}
              defaultValue={draft.category ?? ""}
            />
          </Field>
          <SubmitButton>Confirmar y registrar</SubmitButton>
        </form>
      ) : null}

      {error ? (
        <p className="text-sm text-[var(--danger-ink)]">{error}</p>
      ) : null}
      {applied ? (
        <p className="text-sm text-[var(--accent-deep)]">
          Ticket aplicado al ledger.
        </p>
      ) : null}
    </div>
  );
}
