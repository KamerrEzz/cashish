"use server";

import { randomBytes } from "crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { Resend } from "resend";
import { z } from "zod";
import type { ActionResult } from "@/app/actions/accounts";
import { requireUser } from "@/lib/auth";
import {
  requireProject,
  requireProjectWriter,
  setActiveProjectCookie,
  slugifyProjectName,
} from "@/lib/projects";

function appBaseUrl() {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    process.env.APP_URL?.replace(/\/$/, "") ||
    "https://cashish-beta.vercel.app"
  );
}

export async function createProject(
  formData: FormData,
): Promise<ActionResult> {
  const { supabase } = await requireUser();

  const parsed = z
    .object({
      name: z.string().trim().min(1).max(80),
    })
    .safeParse({ name: formData.get("name") });

  if (!parsed.success) {
    return { ok: false, error: "Ponle un nombre al proyecto." };
  }

  const slug = slugifyProjectName(parsed.data.name);
  const { data, error } = await supabase.rpc("create_project", {
    p_name: parsed.data.name,
    p_slug: slug,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  const projectId = typeof data === "string" ? data : String(data ?? "");
  if (!z.string().uuid().safeParse(projectId).success) {
    return { ok: false, error: "No se pudo crear el proyecto." };
  }

  await setActiveProjectCookie(projectId);
  revalidatePath("/app");
  revalidatePath("/app/projects");
  redirect(`/app/projects/${projectId}`);
}

export async function switchProject(formData: FormData): Promise<void> {
  const { supabase, user } = await requireUser();
  const projectId = String(formData.get("projectId") ?? "");
  if (!z.string().uuid().safeParse(projectId).success) {
    throw new Error("Proyecto inválido.");
  }

  const { data: membership } = await supabase
    .from("project_members")
    .select("project_id")
    .eq("project_id", projectId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!membership) {
    throw new Error("No perteneces a ese proyecto.");
  }

  await setActiveProjectCookie(projectId);
  revalidatePath("/app");
  redirect("/app");
}

export async function inviteToProject(
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, user } = await requireProject();

  const projectId = String(formData.get("projectId") ?? "");
  const parsed = z
    .object({
      projectId: z.string().uuid(),
      email: z.string().trim().email().max(200),
      role: z.enum(["member", "viewer"]).default("member"),
    })
    .safeParse({
      projectId,
      email: formData.get("email"),
      role: formData.get("role") || "member",
    });

  if (!parsed.success) {
    return { ok: false, error: "Correo o rol inválido." };
  }

  const { data: ownership } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", parsed.data.projectId)
    .eq("user_id", user.id)
    .eq("role", "owner")
    .maybeSingle();

  if (!ownership) {
    return { ok: false, error: "Solo el dueño de este proyecto puede invitar." };
  }

  const email = parsed.data.email.toLowerCase();
  if (email === (user.email ?? "").toLowerCase()) {
    return { ok: false, error: "No te puedes invitar a ti mismo." };
  }

  const token = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const { error } = await supabase.from("project_invites").insert({
    project_id: parsed.data.projectId,
    email,
    role: parsed.data.role,
    token,
    invited_by: user.id,
    expires_at: expiresAt,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  const inviteUrl = `${appBaseUrl()}/invite/${token}`;
  const apiKey = process.env.RESEND_API_KEY;
  if (apiKey) {
    const from =
      process.env.RESEND_FROM_EMAIL ?? "Cashish <onboarding@resend.dev>";
    try {
      const { data: project } = await supabase
        .from("projects")
        .select("name")
        .eq("id", parsed.data.projectId)
        .single();
      const roleLabel =
        parsed.data.role === "viewer" ? "solo lectura" : "miembro";
      const resend = new Resend(apiKey);
      await resend.emails.send({
        from,
        to: email,
        subject: `Te invitaron a ${project?.name ?? "un proyecto"} en Cashish`,
        text: [
          `Te invitaron a colaborar en Cashish (${roleLabel}).`,
          ``,
          `Proyecto: ${project?.name ?? "Cashish"}`,
          `Acepta aquí (válido 7 días):`,
          inviteUrl,
          ``,
          `Si no esperabas este correo, ignóralo.`,
        ].join("\n"),
      });
    } catch {
      // Invite row already exists; email is best-effort.
    }
  }

  revalidatePath(`/app/projects/${parsed.data.projectId}`);
  return { ok: true };
}

export async function acceptProjectInvite(
  formData: FormData,
): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const token = String(formData.get("token") ?? "").trim();
  if (!token || token.length < 16) {
    return { ok: false, error: "Token de invitación inválido." };
  }

  const { data, error } = await supabase.rpc("accept_project_invite", {
    p_token: token,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  const projectId = typeof data === "string" ? data : String(data ?? "");
  if (!z.string().uuid().safeParse(projectId).success) {
    return { ok: false, error: "No se pudo aceptar la invitación." };
  }

  await setActiveProjectCookie(projectId);
  revalidatePath("/app");
  revalidatePath("/app/projects");
  redirect("/app");
}

export async function removeMember(formData: FormData): Promise<ActionResult> {
  const { supabase, user } = await requireProject();

  const parsed = z
    .object({
      projectId: z.string().uuid(),
      userId: z.string().uuid(),
    })
    .safeParse({
      projectId: formData.get("projectId"),
      userId: formData.get("userId"),
    });

  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos." };
  }

  if (parsed.data.userId === user.id) {
    return { ok: false, error: "No puedes quitarte a ti mismo." };
  }

  const { data: ownership } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", parsed.data.projectId)
    .eq("user_id", user.id)
    .eq("role", "owner")
    .maybeSingle();

  if (!ownership) {
    return { ok: false, error: "Solo el dueño puede quitar miembros." };
  }

  const { data: target } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", parsed.data.projectId)
    .eq("user_id", parsed.data.userId)
    .maybeSingle();

  if (!target) {
    return { ok: false, error: "Miembro no encontrado." };
  }
  if (target.role === "owner") {
    return { ok: false, error: "No puedes quitar al dueño." };
  }

  const { error } = await supabase
    .from("project_members")
    .delete()
    .eq("project_id", parsed.data.projectId)
    .eq("user_id", parsed.data.userId);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/app/projects/${parsed.data.projectId}`);
  return { ok: true };
}

export async function revokeInvite(formData: FormData): Promise<ActionResult> {
  const { supabase, user } = await requireProject();

  const parsed = z
    .object({
      projectId: z.string().uuid(),
      inviteId: z.string().uuid(),
    })
    .safeParse({
      projectId: formData.get("projectId"),
      inviteId: formData.get("inviteId"),
    });

  if (!parsed.success) {
    return { ok: false, error: "Datos inválidos." };
  }

  const { data: ownership } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", parsed.data.projectId)
    .eq("user_id", user.id)
    .eq("role", "owner")
    .maybeSingle();

  if (!ownership) {
    return { ok: false, error: "Solo el dueño puede revocar invitaciones." };
  }

  const { error } = await supabase
    .from("project_invites")
    .delete()
    .eq("id", parsed.data.inviteId)
    .eq("project_id", parsed.data.projectId)
    .is("accepted_at", null);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/app/projects/${parsed.data.projectId}`);
  return { ok: true };
}

export async function archiveProject(formData: FormData): Promise<ActionResult> {
  const { supabase, user } = await requireProjectWriter();

  const parsed = z
    .object({
      projectId: z.string().uuid(),
    })
    .safeParse({ projectId: formData.get("projectId") });

  if (!parsed.success) {
    return { ok: false, error: "Proyecto inválido." };
  }

  const { data: ownership } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", parsed.data.projectId)
    .eq("user_id", user.id)
    .eq("role", "owner")
    .maybeSingle();

  if (!ownership) {
    return { ok: false, error: "Solo el dueño puede archivar." };
  }

  const { data: project } = await supabase
    .from("projects")
    .select("slug")
    .eq("id", parsed.data.projectId)
    .maybeSingle();

  if (project?.slug === "personal") {
    return { ok: false, error: "No puedes archivar el proyecto Personal." };
  }

  const { error } = await supabase
    .from("projects")
    .update({
      archived_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.projectId);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/app/projects");
  revalidatePath(`/app/projects/${parsed.data.projectId}`);
  return { ok: true };
}
