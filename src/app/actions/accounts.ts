"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import {
  buildInitialStatementWindow,
  todayMexico,
} from "@/lib/credit-cycle";
import { suggestPayToAvoidInterest } from "@/lib/cashflow/engine";
import { parseMoneyInput, formatMoney, money, asCurrency } from "@/lib/money";
import { requireProject, requireProjectWriter } from "@/lib/projects";

const accountTypeSchema = z.enum([
  "cash",
  "checking",
  "savings",
  "credit_card",
]);

const currencySchema = z.enum(["MXN", "COP", "PEN", "CLP"]);

export type ActionResult = { ok: true } | { ok: false; error: string };

export type SmartPayResult =
  | {
      ok: true;
      preview?: boolean;
      amountCents: number;
      mode: string;
      message: string;
    }
  | { ok: false; error: string };

export async function createAccount(formData: FormData): Promise<ActionResult> {
  const { supabase, user, project } = await requireProjectWriter();

  const parsed = z
    .object({
      name: z.string().min(1).max(80),
      type: accountTypeSchema,
      currency: currencySchema.default("MXN"),
      openingBalance: z.string().optional(),
      creditLimit: z.string().optional(),
      statementCloseDay: z.coerce.number().int().min(1).max(28).optional(),
      paymentDueDay: z.coerce.number().int().min(1).max(28).optional(),
      minimumPayment: z.string().optional(),
    })
    .safeParse({
      name: formData.get("name"),
      type: formData.get("type"),
      currency: formData.get("currency") || "MXN",
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
  const currency = data.currency;
  let openingCents = 0;
  try {
    if (data.openingBalance) {
      openingCents = parseMoneyInput(data.openingBalance, currency).amount;
    }
  } catch (e) {
    return {
      ok: false,
      error: e instanceof Error ? e.message : "Saldo inicial inválido.",
    };
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
      limitCents = parseMoneyInput(data.creditLimit, currency).amount;
      if (data.minimumPayment) {
        minPay = parseMoneyInput(data.minimumPayment, currency).amount;
      }
    } catch (e) {
      return {
        ok: false,
        error: e instanceof Error ? e.message : "Límite o pago mínimo inválido.",
      };
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
        project_id: project.id,
        name: data.name,
        type: "credit_card",
        currency,
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
        project_id: project.id,
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
        project_id: project.id,
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
      project_id: project.id,
      name: data.name,
      type: data.type,
      currency,
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
  const { supabase, project } = await requireProjectWriter();
  const { error } = await supabase
    .from("accounts")
    .update({ is_archived: true })
    .eq("id", accountId)
    .eq("project_id", project.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/app");
  revalidatePath("/app/accounts");
  return { ok: true };
}

export async function updateCreditCardProfile(
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, project } = await requireProjectWriter();

  const parsed = z
    .object({
      accountId: z.string().uuid(),
      creditLimit: z.string().min(1),
      statementCloseDay: z.coerce.number().int().min(1).max(28),
      paymentDueDay: z.coerce.number().int().min(1).max(28),
      minimumPayment: z.string().optional(),
    })
    .safeParse({
      accountId: formData.get("accountId"),
      creditLimit: formData.get("creditLimit"),
      statementCloseDay: formData.get("statementCloseDay"),
      paymentDueDay: formData.get("paymentDueDay"),
      minimumPayment: formData.get("minimumPayment") || undefined,
    });

  if (!parsed.success) {
    return { ok: false, error: "Perfil de tarjeta inválido." };
  }

  let limitCents: number;
  let minPay = 0;

  const { data: account } = await supabase
    .from("accounts")
    .select("id, type, currency")
    .eq("id", parsed.data.accountId)
    .eq("project_id", project.id)
    .maybeSingle();

  if (!account || account.type !== "credit_card") {
    return { ok: false, error: "Cuenta TDC no encontrada." };
  }

  const currency = asCurrency(account.currency);
  try {
    limitCents = parseMoneyInput(parsed.data.creditLimit, currency).amount;
    if (parsed.data.minimumPayment) {
      minPay = parseMoneyInput(parsed.data.minimumPayment, currency).amount;
    }
  } catch {
    return { ok: false, error: "Límite o mínimo inválido." };
  }
  if (limitCents <= 0) {
    return { ok: false, error: "El límite debe ser mayor a 0." };
  }

  const { error } = await supabase
    .from("credit_card_profiles")
    .update({
      credit_limit_cents: limitCents,
      statement_close_day: parsed.data.statementCloseDay,
      payment_due_day: parsed.data.paymentDueDay,
      minimum_payment_cents: minPay,
      updated_at: new Date().toISOString(),
    })
    .eq("account_id", account.id)
    .eq("project_id", project.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath(`/app/accounts/${account.id}`);
  revalidatePath("/app");
  return { ok: true };
}

export async function payCreditCardSmart(
  formData: FormData,
): Promise<SmartPayResult> {
  const { supabase, project } = await requireProjectWriter();

  const parsed = z
    .object({
      fromAccountId: z.string().uuid(),
      creditCardAccountId: z.string().uuid(),
      mode: z.enum(["minimum", "avoid_interest", "custom"]),
      amount: z.string().optional(),
      note: z.string().optional(),
      preview: z.enum(["0", "1"]).optional(),
    })
    .safeParse({
      fromAccountId: formData.get("fromAccountId"),
      creditCardAccountId: formData.get("creditCardAccountId"),
      mode: formData.get("mode"),
      amount: formData.get("amount") || undefined,
      note: formData.get("note") || undefined,
      preview: formData.get("preview") || undefined,
    });

  if (!parsed.success) {
    return { ok: false, error: "Datos de pago inválidos." };
  }

  const [
    { data: fromAcc },
    { data: card },
    { data: profile },
    { data: closed },
    { data: open },
  ] = await Promise.all([
    supabase
      .from("accounts")
      .select("*")
      .eq("id", parsed.data.fromAccountId)
      .eq("project_id", project.id)
      .maybeSingle(),
    supabase
      .from("accounts")
      .select("*")
      .eq("id", parsed.data.creditCardAccountId)
      .eq("project_id", project.id)
      .maybeSingle(),
    supabase
      .from("credit_card_profiles")
      .select("*")
      .eq("account_id", parsed.data.creditCardAccountId)
      .eq("project_id", project.id)
      .maybeSingle(),
    supabase
      .from("statement_periods")
      .select("*")
      .eq("account_id", parsed.data.creditCardAccountId)
      .eq("project_id", project.id)
      .eq("status", "closed")
      .order("closes_on", { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from("statement_periods")
      .select("*")
      .eq("account_id", parsed.data.creditCardAccountId)
      .eq("project_id", project.id)
      .eq("status", "open")
      .maybeSingle(),
  ]);

  if (!fromAcc || fromAcc.type === "credit_card") {
    return { ok: false, error: "Cuenta origen inválida." };
  }
  if (!card || card.type !== "credit_card" || !profile) {
    return { ok: false, error: "Tarjeta no encontrada." };
  }
  if (asCurrency(fromAcc.currency) !== asCurrency(card.currency)) {
    return {
      ok: false,
      error: "La liquidez y la TDC deben estar en la misma moneda.",
    };
  }
  const currency = asCurrency(card.currency);

  const suggestion = suggestPayToAvoidInterest({
    closingBalanceCents: closed?.closing_balance_cents ?? null,
    currentDebtCents: card.balance_cents,
    minimumCents:
      closed?.minimum_payment_cents ||
      open?.minimum_payment_cents ||
      profile.minimum_payment_cents,
  });

  let amountCents = 0;
  if (parsed.data.mode === "minimum") {
    amountCents = suggestion.minimumCents;
  } else if (parsed.data.mode === "avoid_interest") {
    amountCents = suggestion.avoidInterestCents;
  } else {
    try {
      amountCents = parseMoneyInput(parsed.data.amount ?? "", currency).amount;
    } catch {
      return { ok: false, error: "Monto personalizado inválido." };
    }
  }

  if (amountCents <= 0) {
    return { ok: false, error: "El monto a pagar debe ser mayor a 0." };
  }
  if (amountCents > fromAcc.balance_cents) {
    return {
      ok: false,
      error: `No hay liquidez suficiente (tienes ${formatMoney(money(fromAcc.balance_cents, currency))}).`,
    };
  }

  const modeLabel =
    parsed.data.mode === "minimum"
      ? "mínimo"
      : parsed.data.mode === "avoid_interest"
        ? "sin intereses"
        : "personalizado";

  if (parsed.data.preview === "1") {
    return {
      ok: true,
      preview: true,
      amountCents,
      mode: parsed.data.mode,
      message: `Vista previa (${modeLabel}): ${formatMoney(money(amountCents, currency))}`,
    };
  }

  const occurred = todayMexico();
  const note = parsed.data.note ?? `Pago TDC (${modeLabel})`;

  const { error } = await supabase.rpc("create_linked_transfer", {
    p_from_account_id: fromAcc.id,
    p_to_account_id: card.id,
    p_amount_cents: amountCents,
    p_occurred_on: occurred,
    p_note: note,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/app");
  revalidatePath(`/app/accounts/${card.id}`);
  revalidatePath("/app/transactions");
  return {
    ok: true,
    amountCents,
    mode: parsed.data.mode,
    message: `Pago registrado (${modeLabel}): ${formatMoney(money(amountCents, currency))}`,
  };
}
