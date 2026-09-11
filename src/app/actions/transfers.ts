"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { parseMxnInput } from "@/lib/money";
import type { ActionResult } from "@/app/actions/accounts";

export async function createLinkedTransfer(
  formData: FormData,
): Promise<ActionResult> {
  const { supabase } = await requireUser();

  const parsed = z
    .object({
      fromAccountId: z.string().uuid(),
      toAccountId: z.string().uuid(),
      amount: z.string().min(1),
      occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      note: z.string().optional(),
    })
    .safeParse({
      fromAccountId: formData.get("fromAccountId"),
      toAccountId: formData.get("toAccountId"),
      amount: formData.get("amount"),
      occurredOn: formData.get("occurredOn"),
      note: formData.get("note") || undefined,
    });

  if (!parsed.success) {
    return { ok: false, error: "Datos de transferencia inválidos." };
  }

  let amountCents: number;
  try {
    amountCents = parseMxnInput(parsed.data.amount).amount;
  } catch {
    return { ok: false, error: "Monto inválido." };
  }
  if (amountCents <= 0) {
    return { ok: false, error: "El monto debe ser mayor a 0." };
  }

  const { error } = await supabase.rpc("create_linked_transfer", {
    p_from_account_id: parsed.data.fromAccountId,
    p_to_account_id: parsed.data.toAccountId,
    p_amount_cents: amountCents,
    p_occurred_on: parsed.data.occurredOn,
    p_note: parsed.data.note ?? null,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/app");
  revalidatePath("/app/transactions");
  revalidatePath("/app/accounts");
  return { ok: true };
}

export async function closeStatementPeriod(
  formData: FormData,
): Promise<ActionResult> {
  const { supabase } = await requireUser();

  const accountId = String(formData.get("accountId") ?? "");
  const minRaw = formData.get("minimumPayment");
  let minCents: number | null = null;
  if (minRaw && String(minRaw).trim() !== "") {
    try {
      minCents = parseMxnInput(String(minRaw)).amount;
    } catch {
      return { ok: false, error: "Pago mínimo inválido." };
    }
  }

  const { error } = await supabase.rpc("close_statement_period", {
    p_account_id: accountId,
    p_minimum_payment_cents: minCents,
  });

  if (error) {
    return { ok: false, error: error.message };
  }

  revalidatePath("/app");
  revalidatePath(`/app/accounts/${accountId}`);
  return { ok: true };
}

export async function markStatementPaid(
  statementId: string,
  accountId: string,
): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("statement_periods")
    .update({ status: "paid" })
    .eq("id", statementId)
    .eq("status", "closed");

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/app/accounts/${accountId}`);
  revalidatePath("/app");
  return { ok: true };
}
