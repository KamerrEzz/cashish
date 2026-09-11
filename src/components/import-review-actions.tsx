"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { applyImportBatch, rejectImportRow } from "@/app/actions/import";
import { SubmitButton } from "@/components/submit-button";
import { Field, inputClass, btnGhost, Mxn } from "@/components/ui";

type Row = {
  id: string;
  status: string;
  occurred_on: string;
  amount_cents: number;
  type: string;
  merchant: string | null;
  description: string | null;
};

type AccountOption = { id: string; name: string };

export function ImportReviewActions({
  batchId,
  defaultAccountId,
  accounts,
  rows,
}: {
  batchId: string;
  defaultAccountId: string | null;
  accounts: AccountOption[];
  rows: Row[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const reviewRows = rows.filter((r) => r.status === "review");

  async function onApply(formData: FormData) {
    setError(null);
    formData.set("batchId", batchId);
    const result = await applyImportBatch(formData);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function onReject(rowId: string) {
    setError(null);
    const result = await rejectImportRow(rowId);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="space-y-4">
      {reviewRows.length > 0 ? (
        <form action={onApply} className="space-y-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4">
          <Field label="Aplicar a cuenta">
            <select
              name="accountId"
              required
              className={inputClass}
              defaultValue={defaultAccountId ?? accounts[0]?.id}
            >
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </Field>
          {error ? (
            <p className="text-sm text-[var(--danger-ink)]">{error}</p>
          ) : null}
          <SubmitButton>
            Aplicar {reviewRows.length} fila{reviewRows.length === 1 ? "" : "s"}
          </SubmitButton>
        </form>
      ) : (
        <p className="text-sm text-[var(--muted)]">
          No hay filas pendientes de revisión.
        </p>
      )}

      <ul className="divide-y divide-[var(--line)] rounded-2xl border border-[var(--line)] bg-[var(--surface)]">
        {rows.map((row) => (
          <li
            key={row.id}
            className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="min-w-0">
              <p className="font-medium text-[var(--ink)]">
                {row.merchant || row.description || "Sin comercio"}
              </p>
              <p className="text-xs text-[var(--muted)]">
                {row.occurred_on} · {row.type} · {row.status}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Mxn cents={row.amount_cents} className="tabular-nums font-medium" />
              {row.status === "review" ? (
                <button
                  type="button"
                  className={btnGhost}
                  onClick={() => onReject(row.id)}
                >
                  Rechazar
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
