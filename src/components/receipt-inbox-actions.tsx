"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { discardReceipt, retryReceiptParse } from "@/app/actions/receipts";
import { btnGhost, btnPrimary } from "@/components/ui";

export function ReceiptInboxActions({
  receiptId,
  status,
  canApply,
}: {
  receiptId: string;
  status: string;
  canApply: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onRetry() {
    setBusy(true);
    setError(null);
    const result = await retryReceiptParse(receiptId);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function onDiscard() {
    setBusy(true);
    setError(null);
    const result = await discardReceipt(receiptId);
    setBusy(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        {canApply ? (
          <a
            href={`/app/transactions?receipt=${receiptId}`}
            className={btnPrimary}
          >
            Aplicar
          </a>
        ) : null}
        {(status === "failed" || status === "ready" || status === "uploaded") && (
          <button
            type="button"
            className={btnGhost}
            disabled={busy}
            onClick={onRetry}
          >
            Reintentar
          </button>
        )}
        {status !== "applied" ? (
          <button
            type="button"
            className={btnGhost}
            disabled={busy}
            onClick={onDiscard}
          >
            Descartar
          </button>
        ) : null}
      </div>
      {error ? (
        <p className="max-w-xs text-right text-xs text-[var(--danger-ink)]">
          {error}
        </p>
      ) : null}
    </div>
  );
}
