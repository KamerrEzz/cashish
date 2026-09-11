"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createBudget, deleteBudget } from "@/app/actions/budgets";
import { SubmitButton } from "@/components/submit-button";
import { Field, inputClass, btnGhost, Mxn } from "@/components/ui";

type BudgetRow = {
  id: string;
  name: string;
  category: string | null;
  monthly_limit_cents: number;
  spentCents: number;
};

export function BudgetForm({ budgets }: { budgets: BudgetRow[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function onCreate(formData: FormData) {
    setError(null);
    const result = await createBudget(formData);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function onDelete(id: string) {
    await deleteBudget(id);
    router.refresh();
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <form
        action={onCreate}
        className="space-y-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-5"
      >
        <h2 className="font-[family-name:var(--font-display)] text-lg">
          Nuevo presupuesto
        </h2>
        <Field label="Nombre">
          <input name="name" required className={inputClass} placeholder="Comida" />
        </Field>
        <Field label="Categoría (opcional)">
          <input
            name="category"
            className={inputClass}
            placeholder="Misma categoría en movimientos"
          />
        </Field>
        <Field label="Límite mensual">
          <input
            name="monthlyLimit"
            required
            className={inputClass}
            placeholder="3000.00"
          />
        </Field>
        {error ? (
          <p className="text-sm text-[var(--danger-ink)]">{error}</p>
        ) : null}
        <SubmitButton>Crear</SubmitButton>
      </form>

      <div className="space-y-3">
        {budgets.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            Sin presupuestos. Define un sobre por categoría.
          </p>
        ) : null}
        {budgets.map((b) => {
          const over = b.spentCents > b.monthly_limit_cents;
          const pct = Math.min(
            100,
            Math.round((b.spentCents / Math.max(b.monthly_limit_cents, 1)) * 100),
          );
          return (
            <div
              key={b.id}
              className="rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4"
            >
              <div className="flex justify-between gap-2">
                <div>
                  <p className="font-semibold text-[var(--ink)]">{b.name}</p>
                  <p className="text-xs text-[var(--muted)]">
                    {b.category ? `Cat. ${b.category}` : "Sin categoría fija"} ·{" "}
                    {pct}%
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p className={over ? "text-[var(--danger-ink)]" : ""}>
                    <Mxn cents={b.spentCents} /> /{" "}
                    <Mxn cents={b.monthly_limit_cents} />
                  </p>
                </div>
              </div>
              <div className="mt-3 h-2 overflow-hidden rounded-full bg-[var(--wash)]">
                <div
                  className={`h-full rounded-full ${
                    over ? "bg-[var(--danger-ink)]" : "bg-[var(--accent)]"
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              <button
                type="button"
                className={`${btnGhost} mt-3`}
                onClick={() => onDelete(b.id)}
              >
                Eliminar
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}
