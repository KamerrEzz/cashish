"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { filtersToSearchParams } from "@/lib/transactions-query";
import { btnGhost, btnPrimary, inputClass } from "@/components/ui";
import type { Account } from "@/lib/database.types";

export function TransactionFilters({
  accounts,
  categories,
  defaults,
}: {
  accounts: Account[];
  categories: string[];
  defaults: { from: string; to: string };
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  const initial = useMemo(
    () => ({
      q: searchParams.get("q") ?? "",
      type: searchParams.get("type") ?? "all",
      account: searchParams.get("account") ?? "",
      category: searchParams.get("category") ?? "",
      from: searchParams.get("from") ?? defaults.from,
      to: searchParams.get("to") ?? defaults.to,
    }),
    [searchParams, defaults.from, defaults.to],
  );

  const [form, setForm] = useState(initial);

  useEffect(() => {
    setForm(initial);
  }, [initial]);

  const apply = useCallback(
    (next: typeof form) => {
      const sp = filtersToSearchParams({
        q: next.q,
        type: next.type as "all" | "expense" | "income" | "transfer",
        accountId: next.account,
        category: next.category,
        from: next.from,
        to: next.to,
        page: 1,
      });
      startTransition(() => {
        router.push(`/app/transactions?${sp.toString()}`);
      });
    },
    [router],
  );

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    apply(form);
  }

  function clearFilters() {
    const cleared = {
      q: "",
      type: "all",
      account: "",
      category: "",
      from: defaults.from,
      to: defaults.to,
    };
    setForm(cleared);
    apply(cleared);
  }

  const exportHref = `/api/export/transactions?${filtersToSearchParams({
    q: form.q,
    type: form.type as "all" | "expense" | "income" | "transfer",
    accountId: form.account,
    category: form.category,
    from: form.from,
    to: form.to,
    page: 1,
  }).toString()}`;

  return (
    <form
      onSubmit={onSubmit}
      className="space-y-3 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-4 sm:p-5"
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold text-[var(--ink)]">Filtros</h2>
          <p className="text-xs text-[var(--muted)]">
            Acota el ledger antes de exportar para tu contador
          </p>
        </div>
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <a href={exportHref} className={btnGhost}>
            Exportar CSV
          </a>
          <button type="button" className={btnGhost} onClick={clearFilters}>
            Limpiar
          </button>
          <button type="submit" className={btnPrimary} disabled={pending}>
            {pending ? "Filtrando…" : "Aplicar"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <label className="block text-sm sm:col-span-2 xl:col-span-2">
          <span className="mb-1.5 block font-medium text-[var(--ink)]">Buscar</span>
          <input
            className={inputClass}
            placeholder="Comercio, descripción, categoría"
            value={form.q}
            onChange={(e) => setForm((f) => ({ ...f, q: e.target.value }))}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-[var(--ink)]">Tipo</span>
          <select
            className={inputClass}
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
          >
            <option value="all">Todos</option>
            <option value="expense">Gastos</option>
            <option value="income">Ingresos</option>
            <option value="transfer">Transferencias</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-[var(--ink)]">Cuenta</span>
          <select
            className={inputClass}
            value={form.account}
            onChange={(e) => setForm((f) => ({ ...f, account: e.target.value }))}
          >
            <option value="">Todas</option>
            {accounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-[var(--ink)]">Desde</span>
          <input
            type="date"
            className={inputClass}
            value={form.from}
            onChange={(e) => setForm((f) => ({ ...f, from: e.target.value }))}
          />
        </label>
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-[var(--ink)]">Hasta</span>
          <input
            type="date"
            className={inputClass}
            value={form.to}
            onChange={(e) => setForm((f) => ({ ...f, to: e.target.value }))}
          />
        </label>
      </div>

      {categories.length > 0 ? (
        <div className="flex flex-wrap gap-2 pt-1">
          <span className="self-center text-xs text-[var(--muted)]">Categorías:</span>
          {categories.slice(0, 12).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => {
                const next = {
                  ...form,
                  category: form.category === c ? "" : c,
                };
                setForm(next);
                apply(next);
              }}
              className={`rounded-full px-2.5 py-1 text-xs ${
                form.category === c
                  ? "bg-[var(--accent-soft)] font-medium text-[var(--accent-deep)]"
                  : "bg-[var(--wash)] text-[var(--muted)] hover:text-[var(--ink)]"
              }`}
            >
              {c}
            </button>
          ))}
        </div>
      ) : null}
    </form>
  );
}
