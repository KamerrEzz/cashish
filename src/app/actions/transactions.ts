"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { asCurrency, parseMoneyInput } from "@/lib/money";
import { merchantKey } from "@/lib/merchant";
import { requireProjectWriter } from "@/lib/projects";
import type { ActionResult } from "@/app/actions/accounts";

export async function createTransaction(
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, user, project } = await requireProjectWriter();

  const parsed = z
    .object({
      accountId: z.string().uuid(),
      type: z.enum(["expense", "income"]),
      amount: z.string().min(1),
      merchant: z.string().optional(),
      description: z.string().optional(),
      category: z.string().optional(),
      occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      subscriptionId: z.string().uuid().optional(),
    })
    .safeParse({
      accountId: formData.get("accountId"),
      type: formData.get("type"),
      amount: formData.get("amount"),
      merchant: formData.get("merchant") || undefined,
      description: formData.get("description") || undefined,
      category: formData.get("category") || undefined,
      occurredOn: formData.get("occurredOn"),
      subscriptionId: formData.get("subscriptionId") || undefined,
    });

  if (!parsed.success) {
    return { ok: false, error: "Datos del movimiento inválidos." };
  }

  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("id, type, balance_cents, currency")
    .eq("id", parsed.data.accountId)
    .eq("project_id", project.id)
    .single();

  if (accountError || !account) {
    return { ok: false, error: "Cuenta no encontrada." };
  }

  const currency = asCurrency(account.currency);
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

  let statementPeriodId: string | null = null;
  if (account.type === "credit_card") {
    const { data: period } = await supabase
      .from("statement_periods")
      .select("id")
      .eq("account_id", account.id)
      .eq("project_id", project.id)
      .eq("status", "open")
      .maybeSingle();
    statementPeriodId = period?.id ?? null;
  }

  // Balance rules:
  // - liquid accounts: income +, expense -
  // - credit_card: expense increases debt +, income (refund) decreases debt -
  let nextBalance = account.balance_cents;
  if (account.type === "credit_card") {
    nextBalance =
      parsed.data.type === "expense"
        ? account.balance_cents + amountCents
        : account.balance_cents - amountCents;
  } else {
    nextBalance =
      parsed.data.type === "income"
        ? account.balance_cents + amountCents
        : account.balance_cents - amountCents;
  }

  const { error: txError } = await supabase.from("transactions").insert({
    user_id: user.id,
    project_id: project.id,
    account_id: account.id,
    type: parsed.data.type,
    amount_cents: amountCents,
    currency,
    merchant: parsed.data.merchant ?? null,
    merchant_key: merchantKey(parsed.data.merchant),
    description: parsed.data.description ?? null,
    category: parsed.data.category ?? null,
    occurred_on: parsed.data.occurredOn,
    statement_period_id: statementPeriodId,
    subscription_id: parsed.data.subscriptionId ?? null,
  });

  if (txError) {
    return { ok: false, error: txError.message };
  }

  const { error: balError } = await supabase
    .from("accounts")
    .update({ balance_cents: nextBalance, updated_at: new Date().toISOString() })
    .eq("id", account.id)
    .eq("project_id", project.id);

  if (balError) {
    return { ok: false, error: balError.message };
  }

  revalidatePath("/app");
  revalidatePath("/app/transactions");
  revalidatePath(`/app/accounts/${account.id}`);
  return { ok: true };
}
