"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { parseMxnInput } from "@/lib/money";
import { requireProject } from "@/lib/projects";
import type { ActionResult } from "@/app/actions/accounts";

export async function createSubscription(
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, user, project } = await requireProject();

  const parsed = z
    .object({
      accountId: z.string().uuid(),
      name: z.string().min(1).max(80),
      merchant: z.string().min(1).max(80),
      amount: z.string().min(1),
      frequency: z.enum(["weekly", "monthly", "yearly"]),
      nextBillingOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      notes: z.string().optional(),
    })
    .safeParse({
      accountId: formData.get("accountId"),
      name: formData.get("name"),
      merchant: formData.get("merchant"),
      amount: formData.get("amount"),
      frequency: formData.get("frequency"),
      nextBillingOn: formData.get("nextBillingOn"),
      notes: formData.get("notes") || undefined,
    });

  if (!parsed.success) {
    return { ok: false, error: "Datos de suscripción inválidos." };
  }

  let amountCents: number;
  try {
    amountCents = parseMxnInput(parsed.data.amount).amount;
  } catch {
    return { ok: false, error: "Monto inválido." };
  }

  const { error } = await supabase.from("subscriptions").insert({
    user_id: user.id,
    project_id: project.id,
    account_id: parsed.data.accountId,
    name: parsed.data.name,
    merchant: parsed.data.merchant,
    amount_cents: amountCents,
    frequency: parsed.data.frequency,
    next_billing_on: parsed.data.nextBillingOn,
    notes: parsed.data.notes ?? null,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/app");
  revalidatePath("/app/subscriptions");
  return { ok: true };
}

export async function toggleSubscription(
  id: string,
  isActive: boolean,
): Promise<ActionResult> {
  const { supabase, project } = await requireProject();
  const { error } = await supabase
    .from("subscriptions")
    .update({ is_active: isActive, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("project_id", project.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/app/subscriptions");
  revalidatePath("/app");
  return { ok: true };
}

export async function dismissReminder(id: string): Promise<ActionResult> {
  const { supabase, project } = await requireProject();
  const { error } = await supabase
    .from("reminders")
    .update({ status: "dismissed" })
    .eq("id", id)
    .eq("project_id", project.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/app");
  return { ok: true };
}
