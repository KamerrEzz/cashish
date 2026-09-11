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
  const { supabase, user } = await requireUser();

  const parsed = z
    .object({
      name: z.string().trim().min(1).max(80),
    })
    .safeParse({ name: formData.get("name") });

  if (!parsed.success) {
    return { ok: false, error: "Ponle un nombre al proyecto." };
  }

  const baseSlug = slugifyProjectName(parsed.data.name);
  let slug = baseSlug;
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const { data, error } = await supabase
      .from("projects")
      .insert({
        name: parsed.data.name,
        slug,
        created_by: user.id,
      })
      .select("id")
      .single();

    if (!error && data) {
      const { error: memberError } = await supabase
        .from("project_members")
        .insert({
          project_id: data.id,
          user_id: user.id,
          role: "owner",
        });
      if (memberError) {
        return { ok: false, error: memberError.message };
      }
      await setActiveProjectCookie(data.id);
      revalidatePath("/app");
      revalidatePath("/app/projects");
      redirect(`/app/projects/${data.id}`);
    }

    if (error?.code === "23505") {
      slug = `${baseSlug}-${randomBytes(2).toString("hex")}`;
      continue;
    }
    return { ok: false, error: error?.message ?? "No se pudo crear el proyecto." };
  }

  return { ok: false, error: "Ese nombre ya está en uso. Prueba otro." };
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
  const { supabase, user, role } = await requireProject();
  if (role !== "owner") {
    return { ok: false, error: "Solo el dueño puede invitar." };
  }

  const projectId = String(formData.get("projectId") ?? "");
  const parsed = z
    .object({
      projectId: z.string().uuid(),
      email: z.string().trim().email().max(200),
    })
    .safeParse({
      projectId,
      email: formData.get("email"),
    });

  if (!parsed.success) {
    return { ok: false, error: "Correo inválido." };
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
    role: "member",
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
      const resend = new Resend(apiKey);
      await resend.emails.send({
        from,
        to: email,
        subject: `Te invitaron a ${project?.name ?? "un proyecto"} en Cashish`,
        text: [
          `Te invitaron a colaborar en Cashish.`,
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
