"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { ActionResult } from "@/app/actions/accounts";
import { requireProject, requireProjectWriter } from "@/lib/projects";

export type OnboardingStep = 1 | 2 | 3;

export async function getOnboardingStatus(): Promise<{
  completed: boolean;
  accountCount: number;
  hasLiquid: boolean;
  hasCard: boolean;
  hasPlannedInflow: boolean;
}> {
  const { supabase, user, project } = await requireProject();
  const [{ data: profile }, { data: accounts }, { count: inflowCount }] =
    await Promise.all([
      supabase
        .from("profiles")
        .select("onboarding_completed_at")
        .eq("id", user.id)
        .maybeSingle(),
      supabase
        .from("accounts")
        .select("id, type")
        .eq("project_id", project.id)
        .eq("is_archived", false),
      supabase
        .from("planned_inflows")
        .select("id", { count: "exact", head: true })
        .eq("project_id", project.id)
        .eq("is_active", true),
    ]);

  const list = accounts ?? [];
  return {
    completed: Boolean(profile?.onboarding_completed_at),
    accountCount: list.length,
    hasLiquid: list.some((a) => a.type !== "credit_card"),
    hasCard: list.some((a) => a.type === "credit_card"),
    hasPlannedInflow: (inflowCount ?? 0) > 0,
  };
}

export async function completeOnboarding(): Promise<ActionResult> {
  const { supabase, user } = await requireProjectWriter();
  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_completed_at: new Date().toISOString() })
    .eq("id", user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/app");
  revalidatePath("/app/quincena");
  revalidatePath("/app/onboarding");
  redirect("/app/quincena");
}

export async function skipOnboarding(): Promise<ActionResult> {
  return completeOnboarding();
}
