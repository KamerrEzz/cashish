import Link from "next/link";
import { notFound } from "next/navigation";
import { inviteToProject, switchProject } from "@/app/actions/projects";
import { requireProject } from "@/lib/projects";
import { SubmitButton } from "@/components/submit-button";
import { SectionTitle } from "@/components/empty-state";
import {
  PageHeader,
  Panel,
  btnGhost,
  btnPrimary,
} from "@/components/ui";
import { InviteForm } from "@/components/invite-form";

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { supabase, user, projects, project: active } = await requireProject();

  const project = projects.find((p) => p.id === id);
  if (!project) {
    notFound();
  }

  const { data: membership } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", project.id)
    .eq("user_id", user.id)
    .maybeSingle();

  const isOwner = membership?.role === "owner";

  const [{ data: members }, { data: invites }] = await Promise.all([
    supabase
      .from("project_members")
      .select("role, created_at, user_id, profiles(email, full_name)")
      .eq("project_id", project.id)
      .order("created_at"),
    isOwner
      ? supabase
          .from("project_invites")
          .select("id, email, role, expires_at, accepted_at, created_at, token")
          .eq("project_id", project.id)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] as const }),
  ]);

  const pending = (invites ?? []).filter((i) => !i.accepted_at);
  const isActive = active.id === project.id;

  return (
    <div className="dash-enter space-y-8">
      <PageHeader
        title={project.name}
        subtitle={`Slug ${project.slug} · ${isOwner ? "Eres dueño" : "Eres miembro"}`}
        action={
          <div className="flex flex-wrap gap-2">
            <Link href="/app/projects" className={btnGhost}>
              Todos
            </Link>
            {!isActive ? (
              <form
                action={async (formData) => {
                  "use server";
                  await switchProject(formData);
                }}
              >
                <input type="hidden" name="projectId" value={project.id} />
                <SubmitButton className={btnPrimary}>Usar este</SubmitButton>
              </form>
            ) : (
              <span className="inline-flex items-center rounded-xl bg-[var(--accent-soft)] px-3 py-2 text-xs font-medium text-[var(--accent-deep)]">
                Proyecto activo
              </span>
            )}
          </div>
        }
      />

      <Panel>
        <SectionTitle title="Miembros" subtitle="Quién escribe en este ledger" />
        <ul className="mt-4 divide-y divide-[var(--line)]">
          {(members ?? []).map((m) => {
            const profile =
              m.profiles && typeof m.profiles === "object" && !Array.isArray(m.profiles)
                ? (m.profiles as { email: string | null; full_name: string | null })
                : null;
            const label =
              profile?.full_name ||
              profile?.email ||
              (m.user_id === user.id ? "Tú" : m.user_id.slice(0, 8));
            return (
              <li
                key={m.user_id}
                className="flex flex-wrap items-center justify-between gap-2 py-3 first:pt-0 last:pb-0"
              >
                <div>
                  <p className="font-medium text-[var(--ink)]">{label}</p>
                  {profile?.email && profile.full_name ? (
                    <p className="text-xs text-[var(--muted)]">{profile.email}</p>
                  ) : null}
                </div>
                <span className="text-xs text-[var(--muted)]">
                  {m.role === "owner" ? "Dueño" : "Miembro"}
                </span>
              </li>
            );
          })}
        </ul>
      </Panel>

      {isOwner ? (
        <>
          <Panel>
            <SectionTitle
              title="Invitar"
              subtitle="Se envía un enlace (7 días). Si Resend está configurado, también llega por correo."
            />
            <div className="mt-4 max-w-md">
              <InviteForm projectId={project.id} inviteAction={inviteToProject} />
            </div>
          </Panel>

          <Panel>
            <SectionTitle
              title="Invitaciones pendientes"
              subtitle={
                pending.length === 0
                  ? "Nada pendiente"
                  : `${pending.length} sin aceptar`
              }
            />
            {pending.length === 0 ? (
              <p className="mt-3 text-sm text-[var(--muted)]">
                Cuando invites a alguien, verás el estado aquí.
              </p>
            ) : (
              <ul className="mt-4 divide-y divide-[var(--line)]">
                {pending.map((inv) => (
                  <li
                    key={inv.id}
                    className="flex flex-wrap items-start justify-between gap-2 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-[var(--ink)]">{inv.email}</p>
                      <p className="text-xs text-[var(--muted)]">
                        Expira{" "}
                        {new Date(inv.expires_at).toLocaleDateString("es-MX", {
                          dateStyle: "medium",
                        })}
                      </p>
                    </div>
                    <p className="max-w-xs break-all text-xs text-[var(--muted)]">
                      /invite/{inv.token}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </>
      ) : null}
    </div>
  );
}
