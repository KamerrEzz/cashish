"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { buildInitialStatementWindow } from "@/lib/credit-cycle";
import { parseMxnInput } from "@/lib/money";

const accountTypeSchema = z.enum([
  "cash",
  "checking",
  "savings",
  "credit_card",
]);

export type ActionResult = { ok: true } | { ok: false; error: string };

export async function createAccount(formData: FormData): Promise<ActionResult> {
  const { supabase, user } = await requireUser();

  const parsed = z
    .object({
      name: z.string().min(1).max(80),
      type: accountTypeSchema,
      openingBalance: z.string().optional(),
      creditLimit: z.string().optional(),
      statementCloseDay: z.coerce.number().int().min(1).max(28).optional(),
      paymentDueDay: z.coerce.number().int().min(1).max(28).optional(),
      minimumPayment: z.string().optional(),
    })
    .safeParse({
      name: formData.get("name"),
      type: formData.get("type"),
      openingBalance: formData.get("openingBalance") || undefined,
      creditLimit: formData.get("creditLimit") || undefined,
      statementCloseDay: formData.get("statementCloseDay") || undefined,
      paymentDueDay: formData.get("paymentDueDay") || undefined,
      minimumPayment: formData.get("minimumPayment") || undefined,
    });

  if (!parsed.success) {
    return { ok: false, error: "Datos de cuenta inválidos." };
  }

  const data = parsed.data;
  let openingCents = 0;
  try {
    if (data.openingBalance) {
      openingCents = parseMxnInput(data.openingBalance).amount;
    }
  } catch {
    return { ok: false, error: "Saldo inicial inválido." };
  }

  if (data.type === "credit_card") {
    if (
      data.creditLimit == null ||
      data.statementCloseDay == null ||
      data.paymentDueDay == null
    ) {
      return {
        ok: false,
        error: "La TDC requiere límite, día de corte y día de pago.",
      };
    }
    let limitCents = 0;
    let minPay = 0;
    try {
      limitCents = parseMxnInput(data.creditLimit).amount;
      if (data.minimumPayment) {
        minPay = parseMxnInput(data.minimumPayment).amount;
      }
    } catch {
      return { ok: false, error: "Límite o pago mínimo inválido." };
    }
    if (limitCents <= 0) {
      return { ok: false, error: "El límite de crédito debe ser mayor a 0." };
    }
    if (openingCents < 0) {
      return { ok: false, error: "La deuda inicial no puede ser negativa." };
    }

    const { data: account, error } = await supabase
      .from("accounts")
      .insert({
        user_id: user.id,
        name: data.name,
        type: "credit_card",
        balance_cents: openingCents,
      })
      .select("id")
      .single();

    if (error || !account) {
      return { ok: false, error: error?.message ?? "No se pudo crear la cuenta." };
    }

    const { error: profileError } = await supabase
      .from("credit_card_profiles")
      .insert({
        account_id: account.id,
        user_id: user.id,
        credit_limit_cents: limitCents,
        statement_close_day: data.statementCloseDay,
        payment_due_day: data.paymentDueDay,
        minimum_payment_cents: minPay,
      });

    if (profileError) {
      await supabase.from("accounts").delete().eq("id", account.id);
      return { ok: false, error: profileError.message };
    }

    const window = buildInitialStatementWindow(
      data.statementCloseDay,
      data.paymentDueDay,
    );
    const { error: periodError } = await supabase
      .from("statement_periods")
      .insert({
        user_id: user.id,
        account_id: account.id,
        opens_on: window.opensOn,
        closes_on: window.closesOn,
        due_on: window.dueOn,
        opening_balance_cents: openingCents,
        minimum_payment_cents: minPay,
        status: "open",
      });

    if (periodError) {
      return { ok: false, error: periodError.message };
    }
  } else {
    const { error } = await supabase.from("accounts").insert({
      user_id: user.id,
      name: data.name,
      type: data.type,
      balance_cents: openingCents,
    });
    if (error) {
      return { ok: false, error: error.message };
    }
  }

  revalidatePath("/app");
  revalidatePath("/app/accounts");
  return { ok: true };
}

export async function archiveAccount(accountId: string): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("accounts")
    .update({ is_archived: true })
    .eq("id", accountId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/app");
  revalidatePath("/app/accounts");
  return { ok: true };
}
