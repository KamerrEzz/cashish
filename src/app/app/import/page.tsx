import Link from "next/link";
import { requireProject } from "@/lib/projects";
import { PageHeader, Panel } from "@/components/ui";
import { ImportUploadForm } from "@/components/import-upload-form";

export default async function ImportPage() {
  const { supabase, project } = await requireProject();

  const [{ data: accounts }, { data: batches }] = await Promise.all([
    supabase
      .from("accounts")
      .select("id, name")
      .eq("project_id", project.id)
      .eq("is_archived", false)
      .order("name"),
    supabase
      .from("import_batches")
      .select("id, source_filename, source_format, status, row_count, applied_count, created_at")
      .eq("project_id", project.id)
      .order("created_at", { ascending: false })
      .limit(20),
  ]);

  return (
    <div className="dash-enter space-y-6 sm:space-y-8">
      <PageHeader
        title="Importar"
        subtitle="Sube un CSV u OFX del banco, revisa filas y aplícalas a una cuenta."
      />

      <Panel>
        <h2 className="font-[family-name:var(--font-display)] text-lg">
          Nuevo archivo
        </h2>
        <div className="mt-4 max-w-md">
          <ImportUploadForm accounts={accounts ?? []} />
        </div>
      </Panel>

      <Panel>
        <h2 className="font-[family-name:var(--font-display)] text-lg">
          Lotes recientes
        </h2>
        <ul className="mt-4 divide-y divide-[var(--line)]">
          {(batches ?? []).length === 0 ? (
            <li className="py-3 text-sm text-[var(--muted)]">
              Aún no hay importaciones.
            </li>
          ) : (
            (batches ?? []).map((b) => (
              <li key={b.id} className="flex items-start justify-between gap-3 py-3">
                <div className="min-w-0">
                  <Link
                    href={`/app/import/${b.id}`}
                    className="font-medium text-[var(--ink)] hover:underline"
                  >
                    {b.source_filename}
                  </Link>
                  <p className="text-xs text-[var(--muted)]">
                    {b.source_format.toUpperCase()} · {b.status} ·{" "}
                    {b.applied_count}/{b.row_count} aplicadas
                  </p>
                </div>
                <span className="text-xs text-[var(--muted)]">
                  {new Date(b.created_at).toLocaleDateString("es-MX")}
                </span>
              </li>
            ))
          )}
        </ul>
      </Panel>
    </div>
  );
}
