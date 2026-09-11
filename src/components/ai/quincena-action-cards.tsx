"use client";

import { useState } from "react";
import { payCreditCardSmart } from "@/app/actions/accounts";
import { btnPrimary, btnGhost, Mxn } from "@/components/ui";
import type { QuincenaPlanAction } from "@/lib/quincena-plan";

export function QuincenaActionCards({
  actions,
  sources,
}: {
  actions: QuincenaPlanAction[];
  sources: { id: string; name: string }[];
}) {
  const [fromId, setFromId] = useState(sources[0]?.id ?? "");
  const [busyId, setBusyId] = useState<string | null>(null);
  const [done, setDone] = useState<Record<string, string>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});

  if (actions.length === 0) return null;

  async function confirm(action: QuincenaPlanAction) {
    const key = `${action.accountId}-${action.mode}`;
    setBusyId(key);
    setErrors((e) => {
      const next = { ...e };
      delete next[key];
      return next;
    });
    const fd = new FormData();
    fd.set(
      "fromAccountId",
      action.fromAccountId || fromId || sources[0]?.id || "",
    );
    fd.set("creditCardAccountId", action.accountId);
    fd.set("mode", action.mode);
    const result = await payCreditCardSmart(fd);
    setBusyId(null);
    if (!result.ok) {
      setErrors((e) => ({ ...e, [key]: result.error }));
      return;
    }
    setDone((d) => ({ ...d, [key]: result.message }));
  }

  return (
    <div className="mt-3 space-y-3 rounded-2xl border border-[var(--accent)]/25 bg-[var(--accent-soft)]/30 p-3">
      <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
        Acciones de quincena
      </p>
      {sources.length > 1 ? (
        <label className="block text-xs text-[var(--muted)]">
          Pagar desde
          <select
            className="mt-1 w-full rounded-xl border border-[var(--line)] bg-[var(--input)] px-3 py-2 text-sm text-[var(--ink)]"
            value={fromId}
            onChange={(e) => setFromId(e.target.value)}
          >
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      <ul className="space-y-2">
        {actions.map((action) => {
          const key = `${action.accountId}-${action.mode}`;
          const isDone = Boolean(done[key]);
          return (
            <li
              key={key}
              className="flex flex-col gap-2 rounded-xl border border-[var(--line)] bg-[var(--surface)] px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
            >
              <div className="min-w-0">
                <p className="font-medium text-[var(--ink)]">{action.label}</p>
                <p className="text-xs text-[var(--muted)]">
                  Vence {action.dueOn} · <Mxn cents={action.amountCents} />
                </p>
                {errors[key] ? (
                  <p className="mt-1 text-xs text-[var(--danger-ink)]">
                    {errors[key]}
                  </p>
                ) : null}
                {done[key] ? (
                  <p className="mt-1 text-xs text-[var(--accent-deep)]">
                    {done[key]}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                className={isDone ? btnGhost : btnPrimary}
                disabled={
                  busyId === key ||
                  isDone ||
                  (!fromId && sources.length === 0)
                }
                onClick={() => confirm(action)}
              >
                {isDone
                  ? "Hecho"
                  : busyId === key
                    ? "Pagando…"
                    : "Confirmar pago"}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export function extractQuincenaActions(payload: unknown): QuincenaPlanAction[] {
  if (!payload || typeof payload !== "object") return [];
  const actions = (payload as { actions?: unknown }).actions;
  if (!Array.isArray(actions)) return [];
  return actions.filter((a): a is QuincenaPlanAction => {
    if (!a || typeof a !== "object") return false;
    const row = a as Record<string, unknown>;
    return (
      row.type === "pay_card" &&
      row.confirm === true &&
      typeof row.accountId === "string" &&
      typeof row.amountCents === "number" &&
      (row.mode === "avoid_interest" || row.mode === "minimum")
    );
  });
}
