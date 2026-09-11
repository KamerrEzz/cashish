import { redirect } from "next/navigation";
import { requireProject } from "@/lib/projects";

/** Redirect to onboarding when profile unfinished and project has zero accounts. */
export async function maybeRedirectToOnboarding(pathname: string) {
  if (!pathname || pathname.startsWith("/app/onboarding")) return;
  const { supabase, user, project } = await requireProject();
  const [{ data: profile }, { count }] = await Promise.all([
    supabase
      .from("profiles")
      .select("onboarding_completed_at")
      .eq("id", user.id)
      .maybeSingle(),
    supabase
      .from("accounts")
      .select("id", { count: "exact", head: true })
      .eq("project_id", project.id)
      .eq("is_archived", false),
  ]);
  if (!profile?.onboarding_completed_at && (count ?? 0) === 0) {
    redirect("/app/onboarding");
  }
}
