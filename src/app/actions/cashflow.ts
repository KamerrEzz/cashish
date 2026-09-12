"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/app/actions/accounts";
import {
  buildInstallmentSchedule,
} from "@/lib/cashflow/engine";
import { asCurrency, parseMoneyInput } from "@/lib/money";
import { requireProjectWriter } from "@/lib/projects";

export async function createPlannedInflow(
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, user, project } = await requireProjectWriter();

  const parsed = z
    .object({
      label: z.string().trim().min(1).max(80),
      amount: z.string().min(1),
      currency: z.enum(["MXN", "COP", "PEN", "CLP"]).default("MXN"),
      nextOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      frequency: z.enum(["weekly", "monthly", "yearly"]),
    })
    .safeParse({
      label: formData.get("label"),
      amount: formData.get("amount"),
      currency: formData.get("currency") || "MXN",
      nextOn: formData.get("nextOn"),
      frequency: formData.get("frequency"),
    });

  if (!parsed.success) {
    return { ok: false, error: "Datos de ingreso planeado inválidos." };
  }

  const currency = asCurrency(parsed.data.currency);
  let amountCents: number;
  try {
    amountCents = parseMoneyInput(parsed.data.amount, currency).amount;
  } catch {
    return { ok: false, error: "Monto inválido." };
  }
  if (amountCents <= 0) {
    return { ok: false, error: "El monto debe ser mayor a 0." };
  }

  const { error } = await supabase.from("planned_inflows").insert({
    project_id: project.id,
    user_id: user.id,
    label: parsed.data.label,
    amount_cents: amountCents,
    currency,
    next_on: parsed.data.nextOn,
    frequency: parsed.data.frequency,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/app/cashflow");
  revalidatePath("/app");
  return { ok: true };
}

export async function createInstallmentPlan(
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, user, project } = await requireProjectWriter();

  const parsed = z
    .object({
      accountId: z.string().uuid(),
      label: z.string().trim().min(1).max(80),
      total: z.string().min(1),
      months: z.coerce.number().int().min(2).max(48),
      firstDueOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      transactionId: z.string().uuid().optional(),
    })
    .safeParse({
      accountId: formData.get("accountId"),
      label: formData.get("label"),
      total: formData.get("total"),
      months: formData.get("months"),
      firstDueOn: formData.get("firstDueOn"),
      transactionId: formData.get("transactionId") || undefined,
    });

  if (!parsed.success) {
    return { ok: false, error: "Datos de MSI inválidos." };
  }

  let totalCents: number;
  try {
    const { data: acc } = await supabase
      .from("accounts")
      .select("currency")
      .eq("id", parsed.data.accountId)
      .maybeSingle();
    totalCents = parseMoneyInput(
      parsed.data.total,
      asCurrency(acc?.currency),
    ).amount;
  } catch {
    return { ok: false, error: "Monto total inválido." };
  }

  let schedule;
  try {
    schedule = buildInstallmentSchedule({
      totalCents,
      months: parsed.data.months,
      firstDueOn: parsed.data.firstDueOn,
    });
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "No se pudo armar el MSI.",
    };
  }

  const { data: account } = await supabase
    .from("accounts")
    .select("id")
    .eq("id", parsed.data.accountId)
    .eq("project_id", project.id)
    .maybeSingle();

  if (!account) {
    return { ok: false, error: "Cuenta no encontrada." };
  }

  const { error } = await supabase.from("installment_plans").insert({
    project_id: project.id,
    user_id: user.id,
    account_id: account.id,
    transaction_id: parsed.data.transactionId ?? null,
    label: parsed.data.label,
    total_cents: totalCents,
    installment_cents: schedule.installmentCents,
    months_total: schedule.months,
    months_remaining: schedule.months,
    next_due_on: schedule.nextDueOn,
  });

  if (error) return { ok: false, error: error.message };
  revalidatePath("/app/cashflow");
  revalidatePath("/app");
  return { ok: true };
}
