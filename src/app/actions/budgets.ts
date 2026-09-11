"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/app/actions/accounts";
import { parseMxnInput } from "@/lib/money";
import { requireProjectWriter } from "@/lib/projects";

export async function createBudget(formData: FormData): Promise<ActionResult> {
  const { supabase, user, project } = await requireProjectWriter();

  const parsed = z
    .object({
      name: z.string().trim().min(1).max(80),
      category: z.string().trim().max(80).optional(),
      monthlyLimit: z.string().min(1),
    })
    .safeParse({
      name: formData.get("name"),
      category: formData.get("category") || undefined,
      monthlyLimit: formData.get("monthlyLimit"),
    });

  if (!parsed.success) {
    return { ok: false, error: "Datos de presupuesto inválidos." };
  }

  let limitCents: number;
  try {
    limitCents = parseMxnInput(parsed.data.monthlyLimit).amount;
  } catch {
    return { ok: false, error: "Límite mensual inválido." };
  }
  if (limitCents <= 0) {
    return { ok: false, error: "El límite debe ser mayor a 0." };
  }

  const { error } = await supabase.from("budgets").insert({
    project_id: project.id,
    user_id: user.id,
    name: parsed.data.name,
    category: parsed.data.category?.trim() || null,
    monthly_limit_cents: limitCents,
  });

  if (error) {
    if (error.message.includes("duplicate") || error.code === "23505") {
      return { ok: false, error: "Ya existe un presupuesto con ese nombre." };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath("/app/budgets");
  return { ok: true };
}

export async function deleteBudget(budgetId: string): Promise<ActionResult> {
  const { supabase, project } = await requireProjectWriter();
  if (!z.string().uuid().safeParse(budgetId).success) {
    return { ok: false, error: "Presupuesto inválido." };
  }

  const { error } = await supabase
    .from("budgets")
    .delete()
    .eq("id", budgetId)
    .eq("project_id", project.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/app/budgets");
  return { ok: true };
}
