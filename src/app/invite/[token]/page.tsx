import Link from "next/link";
import { redirect } from "next/navigation";
import { acceptProjectInvite } from "@/app/actions/projects";
import { createClient } from "@/lib/supabase/server";
import { Panel, btnGhost, btnPrimary } from "@/components/ui";
import { AcceptInviteForm } from "@/components/accept-invite-form";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/login?next=${encodeURIComponent(`/invite/${token}`)}`);
  }

  const { data, error } = await supabase.rpc("preview_project_invite", {
    p_token: token,
  });

  const preview = Array.isArray(data) ? data[0] : data;
  const expired =
    preview?.expires_at && new Date(preview.expires_at).getTime() < Date.now();
  const accepted = Boolean(preview?.accepted_at);

  return (
    <div className="flex min-h-full flex-1 items-center justify-center bg-[var(--wash)] px-4 py-16">
      <Panel className="w-full max-w-md space-y-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">
            Cashish
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-display)] text-2xl text-[var(--ink)]">
            Invitación a proyecto
          </h1>
        </div>

        {error || !preview ? (
          <>
            <p className="text-sm text-[var(--danger-ink)]">
              {error?.message ??
                "No encontramos esta invitación o no es para tu correo."}
            </p>
            <Link href="/app" className={btnGhost}>
              Ir a Cashish
            </Link>
          </>
        ) : accepted ? (
          <>
            <p className="text-sm text-[var(--muted)]">
              Ya aceptaste la invitación a{" "}
              <span className="font-medium text-[var(--ink)]">
                {preview.project_name}
              </span>
              .
            </p>
            <Link href="/app" className={btnPrimary}>
              Abrir app
            </Link>
          </>
        ) : expired ? (
          <>
            <p className="text-sm text-[var(--danger-ink)]">
              Esta invitación a{" "}
              <span className="font-medium">{preview.project_name}</span> ya
              expiró. Pide una nueva al dueño.
            </p>
            <Link href="/app" className={btnGhost}>
              Ir a Cashish
            </Link>
          </>
        ) : (
          <>
            <dl className="space-y-2 text-sm">
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--muted)]">Proyecto</dt>
                <dd className="font-medium text-[var(--ink)]">
                  {preview.project_name}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--muted)]">Para</dt>
                <dd className="text-[var(--ink)]">{preview.email}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--muted)]">Rol</dt>
                <dd className="text-[var(--ink)]">
                  {preview.role === "owner" ? "Dueño" : "Miembro"}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-[var(--muted)]">Expira</dt>
                <dd className="tabular-nums text-[var(--ink)]">
                  {new Date(preview.expires_at).toLocaleDateString("es-MX", {
                    dateStyle: "medium",
                  })}
                </dd>
              </div>
            </dl>
            <AcceptInviteForm token={token} acceptAction={acceptProjectInvite} />
            <p className="text-xs text-[var(--muted)]">
              Entraste como {user.email}. El correo de la invitación debe
              coincidir.
            </p>
          </>
        )}
      </Panel>
    </div>
  );
}
