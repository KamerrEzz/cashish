"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { asCurrency, parseMoneyInput } from "@/lib/money";
import { requireProjectWriter } from "@/lib/projects";
import type { ActionResult } from "@/app/actions/accounts";

export async function createLinkedTransfer(
  formData: FormData,
): Promise<ActionResult> {
  const { supabase } = await requireProjectWriter();

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

  const [{ data: fromAcc }, { data: toAcc }] = await Promise.all([
    supabase
      .from("accounts")
      .select("id, currency")
      .eq("id", parsed.data.fromAccountId)
      .maybeSingle(),
    supabase
      .from("accounts")
      .select("id, currency")
      .eq("id", parsed.data.toAccountId)
      .maybeSingle(),
  ]);
  if (!fromAcc || !toAcc) {
    return { ok: false, error: "Cuenta no encontrada." };
  }
  if (asCurrency(fromAcc.currency) !== asCurrency(toAcc.currency)) {
    return {
      ok: false,
      error: "Solo puedes transferir entre cuentas de la misma moneda.",
    };
  }
  const currency = asCurrency(fromAcc.currency);

  let amountCents: number;
  try {
    amountCents = parseMoneyInput(parsed.data.amount, currency).amount;
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Monto inválido.",
    };
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
  const { supabase } = await requireProjectWriter();

  const accountId = String(formData.get("accountId") ?? "");
  const minRaw = formData.get("minimumPayment");
  let minCents: number | null = null;
  if (minRaw && String(minRaw).trim() !== "") {
    try {
      const { data: acc } = await supabase
        .from("accounts")
        .select("currency")
        .eq("id", accountId)
        .maybeSingle();
      minCents = parseMoneyInput(
        String(minRaw),
        asCurrency(acc?.currency),
      ).amount;
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
  const { supabase, project } = await requireProjectWriter();

  if (
    !z.string().uuid().safeParse(statementId).success ||
    !z.string().uuid().safeParse(accountId).success
  ) {
    return { ok: false, error: "Identificadores inválidos." };
  }

  const { data: period, error: fetchError } = await supabase
    .from("statement_periods")
    .select("id, status, account_id")
    .eq("id", statementId)
    .eq("project_id", project.id)
    .eq("account_id", accountId)
    .maybeSingle();

  if (fetchError) return { ok: false, error: fetchError.message };
  if (!period) return { ok: false, error: "Periodo no encontrado." };
  if (period.status !== "closed") {
    return {
      ok: false,
      error: "Solo puedes marcar como pagado un estado cerrado.",
    };
  }

  const { error } = await supabase
    .from("statement_periods")
    .update({ status: "paid" })
    .eq("id", statementId)
    .eq("project_id", project.id)
    .eq("status", "closed");

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/app/accounts/${accountId}`);
  revalidatePath("/app");
  return { ok: true };
}
