import { requireProject } from "@/lib/projects";
import { PageHeader, Panel } from "@/components/ui";
import { ReceiptInboxActions } from "@/components/receipt-inbox-actions";
import { ReceiptUpload } from "@/components/receipt-upload";

export default async function ReceiptsPage() {
  const { supabase, project } = await requireProject();

  const [{ data: receipts }, { data: accounts }] = await Promise.all([
    supabase
      .from("receipts")
      .select("id, status, mime, parsed, error, created_at, transaction_id")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false })
      .limit(40),
    supabase
      .from("accounts")
      .select("*")
      .eq("project_id", project.id)
      .eq("is_archived", false)
      .order("name"),
  ]);

  return (
    <div className="dash-enter space-y-6 sm:space-y-8">
      <PageHeader
        title="Tickets"
        subtitle="Bandeja de recibos: parsea, corrige y aplica al ledger."
      />

      <Panel>
        <h2 className="font-[family-name:var(--font-display)] text-lg">
          Subir ticket
        </h2>
        <div className="mt-4">
          <ReceiptUpload accounts={accounts ?? []} />
        </div>
      </Panel>

      <Panel>
        <h2 className="font-[family-name:var(--font-display)] text-lg">
          Inbox
        </h2>
        <ul className="mt-4 divide-y divide-[var(--line)]">
          {(receipts ?? []).length === 0 ? (
            <li className="py-3 text-sm text-[var(--muted)]">
              Sin tickets todavía.
            </li>
          ) : (
            (receipts ?? []).map((r) => {
              const parsed =
                r.parsed && typeof r.parsed === "object" && !Array.isArray(r.parsed)
                  ? (r.parsed as Record<string, unknown>)
                  : null;
              const merchant =
                typeof parsed?.merchant === "string" ? parsed.merchant : null;
              const amount =
                typeof parsed?.amount === "string" ? parsed.amount : null;
              return (
                <li
                  key={r.id}
                  className="flex flex-col gap-3 py-3 sm:flex-row sm:items-start sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="font-medium text-[var(--ink)]">
                      {merchant || r.mime} · {r.status}
                    </p>
                    <p className="text-xs text-[var(--muted)]">
                      {amount ? `$${amount}` : "Sin monto"} ·{" "}
                      {new Date(r.created_at).toLocaleString("es-MX")}
                    </p>
                    {r.error ? (
                      <p className="mt-1 text-xs text-[var(--danger-ink)]">
                        {r.error}
                      </p>
                    ) : null}
                  </div>
                  <ReceiptInboxActions
                    receiptId={r.id}
                    status={r.status}
                    canApply={r.status === "ready" && !r.transaction_id}
                  />
                </li>
              );
            })
          )}
        </ul>
      </Panel>
    </div>
  );
}
