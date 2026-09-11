import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { SupabaseClient, User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import type { Database } from "@/lib/database.types";
import { requireUser } from "@/lib/auth";

export const PROJECT_COOKIE = "cashish_project_id";

export type ProjectRow = Database["public"]["Tables"]["projects"]["Row"];
export type ProjectMemberRole = "owner" | "member";

export type ProjectContext = {
  supabase: SupabaseClient<Database>;
  user: User;
  project: ProjectRow;
  role: ProjectMemberRole;
  projects: ProjectRow[];
};

export function slugifyProjectName(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 48);
  return base || "proyecto";
}

export async function listUserProjects(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<ProjectRow[]> {
  const { data: memberships, error } = await supabase
    .from("project_members")
    .select("project_id, role, projects(*)")
    .eq("user_id", userId);
  if (error) throw new Error(error.message);

  const projects: ProjectRow[] = [];
  for (const row of memberships ?? []) {
    const p = row.projects as unknown as ProjectRow | ProjectRow[] | null;
    if (!p) continue;
    const project = Array.isArray(p) ? p[0] : p;
    if (project) projects.push(project);
  }
  projects.sort((a, b) => {
    if (a.slug === "personal") return -1;
    if (b.slug === "personal") return 1;
    return a.name.localeCompare(b.name, "es");
  });
  return projects;
}

export async function resolveActiveProject(
  supabase: SupabaseClient<Database>,
  userId: string,
  preferredId?: string | null,
): Promise<{ project: ProjectRow; role: ProjectMemberRole; projects: ProjectRow[] }> {
  const projects = await listUserProjects(supabase, userId);
  if (projects.length === 0) {
    throw new Error("No tienes proyectos. Recarga o contacta soporte.");
  }

  let project =
    (preferredId && projects.find((p) => p.id === preferredId)) ||
    projects.find((p) => p.slug === "personal") ||
    projects[0];

  const { data: membership } = await supabase
    .from("project_members")
    .select("role")
    .eq("project_id", project.id)
    .eq("user_id", userId)
    .maybeSingle();

  const role = (membership?.role as ProjectMemberRole) || "member";
  return { project, role, projects };
}

export async function requireProject(): Promise<ProjectContext> {
  const { supabase, user } = await requireUser();
  const jar = await cookies();
  const preferred = jar.get(PROJECT_COOKIE)?.value ?? null;
  const { project, role, projects } = await resolveActiveProject(
    supabase,
    user.id,
    preferred,
  );
  return { supabase, user, project, role, projects };
}

export async function setActiveProjectCookie(projectId: string) {
  const jar = await cookies();
  jar.set(PROJECT_COOKIE, projectId, {
    path: "/",
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });
}
