import Link from "next/link";
import { requireProject } from "@/lib/projects";
import { switchProject } from "@/app/actions/projects";
import { SubmitButton } from "@/components/submit-button";
import { EmptyState, SectionTitle } from "@/components/empty-state";
import { CreateProjectForm } from "@/components/create-project-form";
import {
  PageHeader,
  Panel,
  btnGhost,
  btnPrimary,
} from "@/components/ui";

export default async function ProjectsPage() {
  const { project: active, projects, role } = await requireProject();

  return (
    <div className="dash-enter space-y-8">
      <PageHeader
        title="Proyectos"
        subtitle="Cada proyecto es un ledger aparte. Invita gente o cambia el activo."
      />

      <Panel>
        <SectionTitle
          title="Tus proyectos"
          subtitle={`Activo ahora: ${active.name}`}
        />
        <ul className="mt-4 divide-y divide-[var(--line)]">
          {projects.map((p) => {
            const isActive = p.id === active.id;
            return (
              <li
                key={p.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0">
                  <Link
                    href={`/app/projects/${p.id}`}
                    className="font-medium text-[var(--ink)] underline-offset-2 hover:underline"
                  >
                    {p.name}
                  </Link>
                  <p className="text-xs text-[var(--muted)]">
                    {p.slug}
                    {isActive ? " · activo" : ""}
                    {p.slug === "personal" ? " · personal" : ""}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Link href={`/app/projects/${p.id}`} className={btnGhost}>
                    Detalle
                  </Link>
                  {!isActive ? (
                    <form
                      action={async (formData) => {
                        "use server";
                        await switchProject(formData);
                      }}
                    >
                      <input type="hidden" name="projectId" value={p.id} />
                      <SubmitButton className={btnPrimary}>Usar</SubmitButton>
                    </form>
                  ) : (
                    <span className="inline-flex items-center rounded-xl bg-[var(--accent-soft)] px-3 py-2 text-xs font-medium text-[var(--accent-deep)]">
                      En uso
                    </span>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
        {projects.length === 0 ? (
          <EmptyState
            title="Sin proyectos"
            body="Crea uno para separar gastos compartidos o de negocio."
          />
        ) : null}
      </Panel>

      <Panel>
        <SectionTitle
          title="Nuevo proyecto"
          subtitle="Quedas como dueño. Luego puedes invitar miembros."
        />
        <CreateProjectForm />
        <p className="mt-3 text-xs text-[var(--muted)]">
          Rol actual en el proyecto activo: {role === "owner" ? "dueño" : "miembro"}.
        </p>
      </Panel>
    </div>
  );
}
