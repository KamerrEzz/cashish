import { Suspense } from "react";
import { requireProject } from "@/lib/projects";
import { todayMexico } from "@/lib/credit-cycle";
import { Mxn, PageHeader, Panel } from "@/components/ui";
import { EmptyState, SectionTitle } from "@/components/empty-state";
import { TransactionForms } from "@/components/transaction-forms";
import { TransactionFilters } from "@/components/transaction-filters";
import { TransactionLedger } from "@/components/transaction-ledger";
import { ReceiptUpload } from "@/components/receipt-upload";
import {
  TX_PAGE_SIZE,
  filtersToSearchParams,
  parseTransactionFilters,
  resolveDateRange,
} from "@/lib/transactions-query";

type SearchParams = Promise<{ [key: string]: string | string[] | undefined }>;

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { supabase, user, project } = await requireProject();
  const params = await searchParams;
  const receiptParam = params.receipt;
  const focusReceiptId =
    typeof receiptParam === "string" && receiptParam.length > 0
      ? receiptParam
      : null;
  const filters = parseTransactionFilters(params);
  const today = todayMexico();
  const range = resolveDateRange(filters, today);
  const fromIdx = (filters.page - 1) * TX_PAGE_SIZE;
  const toIdx = fromIdx + TX_PAGE_SIZE - 1;

  let listQuery = supabase
    .from("transactions")
    .select(
      "id, type, amount_cents, merchant, description, category, occurred_on, transfer_id, accounts(name)",
      { count: "exact" },
    )
    .eq("user_id", user.id)
    .eq("project_id", project.id)
    .gte("occurred_on", range.from)
    .lte("occurred_on", range.to)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false })
    .range(fromIdx, toIdx);

  let summaryQuery = supabase
    .from("transactions")
    .select("amount_cents, type, transfer_id")
    .eq("user_id", user.id)
    .eq("project_id", project.id)
    .gte("occurred_on", range.from)
    .lte("occurred_on", range.to)
    .limit(10000);

  let categoriesQuery = supabase
    .from("transactions")
    .select("category")
    .eq("user_id", user.id)
    .eq("project_id", project.id)
    .not("category", "is", null)
    .order("occurred_on", { ascending: false })
    .limit(300);

  if (filters.accountId) {
    listQuery = listQuery.eq("account_id", filters.accountId);
    summaryQuery = summaryQuery.eq("account_id", filters.accountId);
  }
  if (filters.category) {
    listQuery = listQuery.ilike("category", `%${filters.category}%`);
    summaryQuery = summaryQuery.ilike("category", `%${filters.category}%`);
  }
  if (filters.type === "expense") {
    listQuery = listQuery.eq("type", "expense").is("transfer_id", null);
    summaryQuery = summaryQuery.eq("type", "expense").is("transfer_id", null);
  } else if (filters.type === "income") {
    listQuery = listQuery.eq("type", "income").is("transfer_id", null);
    summaryQuery = summaryQuery.eq("type", "income").is("transfer_id", null);
  } else if (filters.type === "transfer") {
    listQuery = listQuery.not("transfer_id", "is", null);
    summaryQuery = summaryQuery.not("transfer_id", "is", null);
  }
  if (filters.q) {
    const q = filters.q.replace(/[%_,]/g, "");
    const or = `merchant.ilike.%${q}%,description.ilike.%${q}%,category.ilike.%${q}%`;
    listQuery = listQuery.or(or);
    summaryQuery = summaryQuery.or(or);
  }

  const [{ data: accounts }, listResult, summaryResult, categoriesResult, focusReceipt] =
    await Promise.all([
      supabase
        .from("accounts")
        .select("*")
        .eq("project_id", project.id)
        .eq("is_archived", false)
        .order("name"),
      listQuery,
      summaryQuery,
      categoriesQuery,
      focusReceiptId
        ? supabase
            .from("receipts")
            .select("id, status, parsed")
            .eq("id", focusReceiptId)
            .eq("project_id", project.id)
            .maybeSingle()
        : Promise.resolve({ data: null }),
    ]);

  let initialReceiptId: string | null = null;
  let initialDraft: import("@/app/actions/receipts").ParsedReceiptDraft | null =
    null;
  if (
    focusReceipt.data &&
    focusReceipt.data.status === "ready" &&
    focusReceipt.data.parsed &&
    typeof focusReceipt.data.parsed === "object"
  ) {
    const p = focusReceipt.data.parsed as Record<string, unknown>;
    initialReceiptId = focusReceipt.data.id;
    initialDraft = {
      amount: String(p.amount ?? ""),
      occurredOn: String(p.occurredOn ?? today),
      merchant: (p.merchant as string | null) ?? null,
      category: (p.category as string | null) ?? null,
      description: (p.description as string | null) ?? null,
      type: p.type === "income" ? "income" : "expense",
      confidence:
        typeof p.confidence === "number" ? p.confidence : 0.7,
    };
  }

  const txs = listResult.data ?? [];
  const total = listResult.count ?? 0;

  let income = 0;
  let expense = 0;
  for (const row of summaryResult.data ?? []) {
    if (row.transfer_id) continue;
    if (row.type === "income") income += row.amount_cents;
    else if (row.type === "expense") expense += row.amount_cents;
  }

  const categories = [
    ...new Set(
      (categoriesResult.data ?? [])
        .map((r) => r.category?.trim())
        .filter((c): c is string => Boolean(c)),
    ),
  ].slice(0, 12);

  const ledgerRows = txs.map((tx) => {
    const accountName =
      tx.accounts && typeof tx.accounts === "object" && "name" in tx.accounts
        ? String((tx.accounts as { name: string }).name)
        : "—";
    return {
      id: tx.id,
      type: tx.type,
      amount_cents: tx.amount_cents,
      merchant: tx.merchant,
      description: tx.description,
      category: tx.category,
      occurred_on: tx.occurred_on,
      transfer_id: tx.transfer_id,
      account_name: accountName,
    };
  });

  const baseQuery = filtersToSearchParams({
    q: filters.q,
    type: filters.type,
    accountId: filters.accountId,
    category: filters.category,
    from: range.from,
    to: range.to,
  }).toString();

  const rangeLabel = `${range.from} → ${range.to}`;

  return (
    <div className="dash-enter space-y-6 sm:space-y-8">
      <PageHeader
        title="Movimientos"
        subtitle="Ledger filtrable: busca, pagina y exporta CSV para tu contador."
      />

      <Suspense
        fallback={
          <div className="h-28 animate-pulse rounded-2xl border border-[var(--line)] bg-[var(--surface)]" />
        }
      >
        <TransactionFilters
          accounts={accounts ?? []}
          categories={categories}
          defaults={{ from: range.from, to: range.to }}
        />
      </Suspense>

      <div className="grid gap-3 sm:grid-cols-3">
        <Panel className="!p-4">
          <p className="text-xs text-[var(--muted)]">Ingresos (filtro)</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-xl tabular-nums text-[var(--positive)]">
            <Mxn cents={income} />
          </p>
        </Panel>
        <Panel className="!p-4">
          <p className="text-xs text-[var(--muted)]">Gastos (filtro)</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-xl tabular-nums">
            <Mxn cents={expense} />
          </p>
        </Panel>
        <Panel className="!p-4">
          <p className="text-xs text-[var(--muted)]">Periodo</p>
          <p className="mt-1 text-sm font-medium tabular-nums text-[var(--ink)]">
            {rangeLabel}
          </p>
          <p className="mt-0.5 text-xs text-[var(--muted)]">
            {total} movimiento{total === 1 ? "" : "s"}
          </p>
        </Panel>
      </div>

      <section className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <SectionTitle
            title="Ledger"
            subtitle="Tabla densa · 25 por página · exporta el mismo filtro"
          />
        </div>
        <TransactionLedger
          rows={ledgerRows}
          total={total}
          page={filters.page}
          pageSize={TX_PAGE_SIZE}
          baseQuery={baseQuery}
        />
      </section>

      <details className="group rounded-2xl border border-[var(--line)] bg-[var(--surface)] open:shadow-none">
        <summary className="cursor-pointer list-none px-4 py-4 sm:px-5 [&::-webkit-details-marker]:hidden">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="font-medium text-[var(--ink)]">Registrar movimiento</p>
              <p className="text-xs text-[var(--muted)]">
                Captura colapsada para no competir con el ledger
              </p>
            </div>
            <span className="text-sm text-[var(--accent)] group-open:hidden">
              Abrir
            </span>
            <span className="hidden text-sm text-[var(--muted)] group-open:inline">
              Cerrar
            </span>
          </div>
        </summary>
        <div className="border-t border-[var(--line)] px-4 py-4 sm:px-5">
          {(accounts ?? []).length === 0 ? (
            <EmptyState
              title="Necesitas una cuenta"
              body="Crea al menos un débito o efectivo para empezar a registrar."
              actionHref="/app/accounts/new"
              actionLabel="Nueva cuenta"
            />
          ) : (
            <TransactionForms accounts={accounts ?? []} />
          )}
        </div>
      </details>

      {(accounts ?? []).length > 0 ? (
        <Panel>
          <SectionTitle
            title="Ticket / recibo"
            subtitle="Sube foto o PDF · BYOK lee el borrador · tú confirmas"
          />
          <div className="mt-4">
            <ReceiptUpload
              accounts={accounts ?? []}
              initialReceiptId={initialReceiptId}
              initialDraft={initialDraft}
            />
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
