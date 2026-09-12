"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { asCurrency, parseMoneyInput } from "@/lib/money";
import { merchantKey } from "@/lib/merchant";
import { requireProject, requireProjectWriter } from "@/lib/projects";
import type { ActionResult } from "@/app/actions/accounts";

export async function createSubscription(
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, user, project } = await requireProjectWriter();

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

  const { data: account } = await supabase
    .from("accounts")
    .select("id, currency")
    .eq("id", parsed.data.accountId)
    .eq("project_id", project.id)
    .maybeSingle();
  if (!account) {
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

  const { error } = await supabase.from("subscriptions").insert({
    user_id: user.id,
    project_id: project.id,
    account_id: parsed.data.accountId,
    name: parsed.data.name,
    merchant: parsed.data.merchant,
    amount_cents: amountCents,
    currency,
    frequency: parsed.data.frequency,
    next_billing_on: parsed.data.nextBillingOn,
    notes: parsed.data.notes ?? null,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/app");
  revalidatePath("/app/subscriptions");
  return { ok: true };
}

export async function updateSubscription(
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, project } = await requireProjectWriter();

  const parsed = z
    .object({
      id: z.string().uuid(),
      name: z.string().min(1).max(80),
      merchant: z.string().min(1).max(80),
      amount: z.string().min(1),
      frequency: z.enum(["weekly", "monthly", "yearly"]),
      nextBillingOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      notes: z.string().optional(),
      accountId: z.string().uuid().optional(),
    })
    .safeParse({
      id: formData.get("id"),
      name: formData.get("name"),
      merchant: formData.get("merchant"),
      amount: formData.get("amount"),
      frequency: formData.get("frequency"),
      nextBillingOn: formData.get("nextBillingOn"),
      notes: formData.get("notes") || undefined,
      accountId: formData.get("accountId") || undefined,
    });

  if (!parsed.success) {
    return { ok: false, error: "Datos de actualización inválidos." };
  }

  let amountCents: number;
  try {
    const accountId =
      parsed.data.accountId ??
      (
        await supabase
          .from("subscriptions")
          .select("account_id, currency")
          .eq("id", parsed.data.id)
          .eq("project_id", project.id)
          .maybeSingle()
      ).data?.account_id;
    const { data: acc } = accountId
      ? await supabase
          .from("accounts")
          .select("currency")
          .eq("id", accountId)
          .maybeSingle()
      : { data: null };
    amountCents = parseMoneyInput(
      parsed.data.amount,
      asCurrency(acc?.currency),
    ).amount;
  } catch {
    return { ok: false, error: "Monto inválido." };
  }

  const patch: {
    name: string;
    merchant: string;
    amount_cents: number;
    frequency: "weekly" | "monthly" | "yearly";
    next_billing_on: string;
    notes: string | null;
    updated_at: string;
    account_id?: string;
  } = {
    name: parsed.data.name,
    merchant: parsed.data.merchant,
    amount_cents: amountCents,
    frequency: parsed.data.frequency,
    next_billing_on: parsed.data.nextBillingOn,
    notes: parsed.data.notes ?? null,
    updated_at: new Date().toISOString(),
  };
  if (parsed.data.accountId) {
    patch.account_id = parsed.data.accountId;
  }

  const { error } = await supabase
    .from("subscriptions")
    .update(patch)
    .eq("id", parsed.data.id)
    .eq("project_id", project.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/app/subscriptions");
  revalidatePath("/app");
  return { ok: true };
}

export async function toggleSubscription(
  id: string,
  isActive: boolean,
): Promise<ActionResult> {
  const { supabase, project } = await requireProjectWriter();
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
  const { supabase, project } = await requireProjectWriter();
  const { error } = await supabase
    .from("reminders")
    .update({ status: "dismissed" })
    .eq("id", id)
    .eq("project_id", project.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/app");
  revalidatePath("/app/reminders");
  return { ok: true };
}

export type SubscriptionSuggestion = {
  merchantKey: string;
  merchantSample: string;
  count: number;
  avgCents: number;
  lastOccurredOn: string;
  alreadyTracked: boolean;
};

export async function suggestSubscriptions(): Promise<{
  ok: true;
  suggestions: SubscriptionSuggestion[];
} | { ok: false; error: string }> {
  const { supabase, project } = await requireProject();

  const since = new Date();
  since.setMonth(since.getMonth() - 6);
  const sinceIso = since.toISOString().slice(0, 10);

  const [{ data: txs }, { data: subs }] = await Promise.all([
    supabase
      .from("transactions")
      .select("merchant, merchant_key, amount_cents, occurred_on, type")
      .eq("project_id", project.id)
      .eq("type", "expense")
      .is("transfer_id", null)
      .gte("occurred_on", sinceIso)
      .not("merchant", "is", null)
      .limit(2000),
    supabase
      .from("subscriptions")
      .select("merchant")
      .eq("project_id", project.id),
  ]);

  const tracked = new Set(
    (subs ?? [])
      .map((s) => merchantKey(s.merchant))
      .filter((k): k is string => Boolean(k)),
  );

  type Acc = {
    merchantSample: string;
    amounts: number[];
    dates: string[];
  };
  const byKey = new Map<string, Acc>();

  for (const tx of txs ?? []) {
    const key = tx.merchant_key || merchantKey(tx.merchant);
    if (!key || !tx.merchant) continue;
    const acc = byKey.get(key) ?? {
      merchantSample: tx.merchant,
      amounts: [],
      dates: [],
    };
    acc.amounts.push(tx.amount_cents);
    acc.dates.push(tx.occurred_on);
    byKey.set(key, acc);
  }

  const suggestions: SubscriptionSuggestion[] = [];
  for (const [key, acc] of byKey) {
    if (acc.amounts.length < 3) continue;
    // Rough recurrence: at least 3 hits and amount variance within 15%
    const avg =
      acc.amounts.reduce((s, n) => s + n, 0) / Math.max(acc.amounts.length, 1);
    const within = acc.amounts.filter(
      (a) => Math.abs(a - avg) / Math.max(avg, 1) <= 0.15,
    );
    if (within.length < 3) continue;
    acc.dates.sort();
    suggestions.push({
      merchantKey: key,
      merchantSample: acc.merchantSample,
      count: acc.amounts.length,
      avgCents: Math.round(avg),
      lastOccurredOn: acc.dates[acc.dates.length - 1] ?? "",
      alreadyTracked: tracked.has(key),
    });
  }

  suggestions.sort((a, b) => b.count - a.count);

  return { ok: true, suggestions: suggestions.slice(0, 12) };
}
