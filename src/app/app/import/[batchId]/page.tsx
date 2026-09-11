import Link from "next/link";
import { notFound } from "next/navigation";
import { requireProject } from "@/lib/projects";
import { PageHeader, Panel, btnGhost } from "@/components/ui";
import { ImportReviewActions } from "@/components/import-review-actions";

export default async function ImportBatchPage({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  const { batchId } = await params;
  const { supabase, project } = await requireProject();

  const { data: batch } = await supabase
    .from("import_batches")
    .select("*")
    .eq("id", batchId)
    .eq("project_id", project.id)
    .maybeSingle();

  if (!batch) notFound();

  const [{ data: rows }, { data: accounts }] = await Promise.all([
    supabase
      .from("import_rows")
      .select(
        "id, status, occurred_on, amount_cents, type, merchant, description",
      )
      .eq("batch_id", batch.id)
      .eq("project_id", project.id)
      .order("occurred_on", { ascending: false }),
    supabase
      .from("accounts")
      .select("id, name")
      .eq("project_id", project.id)
      .eq("is_archived", false)
      .order("name"),
  ]);

  return (
    <div className="dash-enter space-y-6">
      <PageHeader
        title={batch.source_filename}
        subtitle={`${batch.source_format.toUpperCase()} · ${batch.status} · ${batch.applied_count}/${batch.row_count}`}
        action={
          <Link href="/app/import" className={btnGhost}>
            Todos los lotes
          </Link>
        }
      />

      <Panel>
        <ImportReviewActions
          batchId={batch.id}
          defaultAccountId={batch.account_id}
          accounts={accounts ?? []}
          rows={rows ?? []}
        />
      </Panel>
    </div>
  );
}
