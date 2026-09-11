import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { createServiceClient } from "@/lib/supabase/admin";
import { formatMxn, money, parseMxnInput } from "@/lib/money";
import { availableCreditCents, todayMexico } from "@/lib/credit-cycle";

function ok(data: unknown) {
  const text = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  return {
    content: [{ type: "text" as const, text }],
    structuredContent: typeof data === "object" && data !== null ? data : { result: data },
  };
}

function fail(message: string) {
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true as const,
  };
}

export function registerCashishTools(server: McpServer, userId: string) {
  const db = () => createServiceClient();

  server.registerTool(
    "cashish_dashboard",
    {
      title: "Cashish dashboard",
      description:
        "Resumen del usuario: liquidez, tarjetas (deuda/disponible/corte/pago) y próximas suscripciones.",
      inputSchema: z.object({}).strict(),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () => {
      const supabase = db();
      const [{ data: accounts }, { data: profiles }, { data: periods }, { data: subs }] =
        await Promise.all([
          supabase
            .from("accounts")
            .select("*")
            .eq("user_id", userId)
            .eq("is_archived", false),
          supabase.from("credit_card_profiles").select("*").eq("user_id", userId),
          supabase
            .from("statement_periods")
            .select("*")
            .eq("user_id", userId)
            .eq("status", "open"),
          supabase
            .from("subscriptions")
            .select("*, accounts(name)")
            .eq("user_id", userId)
            .eq("is_active", true)
            .order("next_billing_on")
            .limit(10),
        ]);

      const profileBy = new Map((profiles ?? []).map((p) => [p.account_id, p]));
      const periodBy = new Map((periods ?? []).map((p) => [p.account_id, p]));

      return ok({
        liquid: (accounts ?? [])
          .filter((a) => a.type !== "credit_card")
          .map((a) => ({
            id: a.id,
            name: a.name,
            type: a.type,
            balance: formatMxn(money(a.balance_cents)),
            balance_cents: a.balance_cents,
          })),
        credit_cards: (accounts ?? [])
          .filter((a) => a.type === "credit_card")
          .map((a) => {
            const profile = profileBy.get(a.id);
            const period = periodBy.get(a.id);
            const available = profile
              ? availableCreditCents(profile.credit_limit_cents, a.balance_cents)
              : null;
            return {
              id: a.id,
              name: a.name,
              owed: formatMxn(money(a.balance_cents)),
              owed_cents: a.balance_cents,
              available: available != null ? formatMxn(money(available)) : null,
              limit: profile
                ? formatMxn(money(profile.credit_limit_cents))
                : null,
              statement_closes_on: period?.closes_on ?? null,
              payment_due_on: period?.due_on ?? null,
            };
          }),
        upcoming_subscriptions: (subs ?? []).map((s) => ({
          id: s.id,
          name: s.name,
          merchant: s.merchant,
          amount: formatMxn(money(s.amount_cents)),
          next_billing_on: s.next_billing_on,
          account:
            s.accounts && typeof s.accounts === "object" && "name" in s.accounts
              ? (s.accounts as { name: string }).name
              : null,
        })),
      });
    },
  );

  server.registerTool(
    "cashish_list_accounts",
    {
      title: "List accounts",
      description: "Lista cuentas del usuario (efectivo, débito, ahorros, TDC).",
      inputSchema: z
        .object({
          include_archived: z.boolean().default(false),
        })
        .strict(),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ include_archived }) => {
      let query = db()
        .from("accounts")
        .select("*, credit_card_profiles(*)")
        .eq("user_id", userId)
        .order("created_at");
      if (!include_archived) {
        query = query.eq("is_archived", false);
      }
      const { data, error } = await query;
      if (error) return fail(error.message);
      return ok(data);
    },
  );

  server.registerTool(
    "cashish_list_transactions",
    {
      title: "List transactions",
      description: "Últimos movimientos, opcionalmente filtrados por cuenta.",
      inputSchema: z
        .object({
          account_id: z.string().uuid().optional(),
          limit: z.number().int().min(1).max(100).default(25),
        })
        .strict(),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ account_id, limit }) => {
      let query = db()
        .from("transactions")
        .select("*, accounts(name)")
        .eq("user_id", userId)
        .order("occurred_on", { ascending: false })
        .limit(limit);
      if (account_id) query = query.eq("account_id", account_id);
      const { data, error } = await query;
      if (error) return fail(error.message);
      return ok(data);
    },
  );

  server.registerTool(
    "cashish_create_transaction",
    {
      title: "Create income or expense",
      description:
        "Registra un ingreso o gasto en una cuenta. Montos como string decimal MXN (ej. \"229.50\").",
      inputSchema: z
        .object({
          account_id: z.string().uuid(),
          type: z.enum(["expense", "income"]),
          amount: z.string().describe('Monto MXN, ej. "150.00"'),
          merchant: z.string().optional(),
          description: z.string().optional(),
          category: z.string().optional(),
          occurred_on: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .optional(),
        })
        .strict(),
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    async (input) => {
      let amountCents: number;
      try {
        amountCents = parseMxnInput(input.amount).amount;
      } catch (e) {
        return fail(e instanceof Error ? e.message : "Monto inválido");
      }
      if (amountCents <= 0) return fail("El monto debe ser > 0");

      const supabase = db();
      const { data: account, error: accountError } = await supabase
        .from("accounts")
        .select("*")
        .eq("id", input.account_id)
        .eq("user_id", userId)
        .single();
      if (accountError || !account) return fail("Cuenta no encontrada");

      let statementPeriodId: string | null = null;
      if (account.type === "credit_card") {
        const { data: period } = await supabase
          .from("statement_periods")
          .select("id")
          .eq("account_id", account.id)
          .eq("status", "open")
          .maybeSingle();
        statementPeriodId = period?.id ?? null;
      }

      let nextBalance = account.balance_cents;
      if (account.type === "credit_card") {
        nextBalance =
          input.type === "expense"
            ? account.balance_cents + amountCents
            : account.balance_cents - amountCents;
      } else {
        nextBalance =
          input.type === "income"
            ? account.balance_cents + amountCents
            : account.balance_cents - amountCents;
      }

      const { data: tx, error: txError } = await supabase
        .from("transactions")
        .insert({
          user_id: userId,
          account_id: account.id,
          type: input.type,
          amount_cents: amountCents,
          merchant: input.merchant ?? null,
          description: input.description ?? null,
          category: input.category ?? null,
          occurred_on: input.occurred_on ?? todayMexico(),
          statement_period_id: statementPeriodId,
        })
        .select("*")
        .single();
      if (txError) return fail(txError.message);

      const { error: balError } = await supabase
        .from("accounts")
        .update({
          balance_cents: nextBalance,
          updated_at: new Date().toISOString(),
        })
        .eq("id", account.id);
      if (balError) return fail(balError.message);

      return ok({
        transaction: tx,
        new_balance_cents: nextBalance,
        new_balance: formatMxn(money(nextBalance)),
      });
    },
  );

  server.registerTool(
    "cashish_pay_credit_card",
    {
      title: "Pay credit card",
      description:
        "Pago vinculado: baja el saldo de una cuenta líquida y reduce la deuda de la TDC.",
      inputSchema: z
        .object({
          from_account_id: z.string().uuid().describe("Cuenta débito/efectivo/ahorros"),
          credit_card_account_id: z.string().uuid(),
          amount: z.string().describe('Monto MXN, ej. "5000.00"'),
          note: z.string().optional(),
          occurred_on: z
            .string()
            .regex(/^\d{4}-\d{2}-\d{2}$/)
            .optional(),
        })
        .strict(),
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    async (input) => {
      let amountCents: number;
      try {
        amountCents = parseMxnInput(input.amount).amount;
      } catch (e) {
        return fail(e instanceof Error ? e.message : "Monto inválido");
      }

      // RPCs use auth.uid(); service role has null uid — perform transfer logic via admin SQL path
      // by temporarily impersonating is not available; call linked transfer through direct updates.
      const supabase = db();
      const { data: fromAcc } = await supabase
        .from("accounts")
        .select("*")
        .eq("id", input.from_account_id)
        .eq("user_id", userId)
        .single();
      const { data: toAcc } = await supabase
        .from("accounts")
        .select("*")
        .eq("id", input.credit_card_account_id)
        .eq("user_id", userId)
        .single();

      if (!fromAcc || !toAcc) return fail("Cuenta no encontrada");
      if (fromAcc.type === "credit_card") {
        return fail("No se puede pagar desde una TDC en el MVP");
      }
      if (toAcc.type !== "credit_card") {
        return fail("credit_card_account_id debe ser una tarjeta de crédito");
      }

      const occurred = input.occurred_on ?? todayMexico();
      const note = input.note ?? "Pago tarjeta (MCP)";

      const { data: transfer, error: transferError } = await supabase
        .from("transfers")
        .insert({
          user_id: userId,
          from_account_id: fromAcc.id,
          to_account_id: toAcc.id,
          amount_cents: amountCents,
          occurred_on: occurred,
          note,
        })
        .select("*")
        .single();
      if (transferError) return fail(transferError.message);

      await supabase
        .from("accounts")
        .update({
          balance_cents: fromAcc.balance_cents - amountCents,
          updated_at: new Date().toISOString(),
        })
        .eq("id", fromAcc.id);
      await supabase
        .from("accounts")
        .update({
          balance_cents: toAcc.balance_cents - amountCents,
          updated_at: new Date().toISOString(),
        })
        .eq("id", toAcc.id);

      const { data: openPeriod } = await supabase
        .from("statement_periods")
        .select("id")
        .eq("account_id", toAcc.id)
        .eq("status", "open")
        .maybeSingle();

      await supabase.from("transactions").insert([
        {
          user_id: userId,
          account_id: fromAcc.id,
          type: "transfer",
          amount_cents: amountCents,
          description: note,
          occurred_on: occurred,
          transfer_id: transfer.id,
        },
        {
          user_id: userId,
          account_id: toAcc.id,
          type: "transfer",
          amount_cents: amountCents,
          description: note,
          occurred_on: occurred,
          transfer_id: transfer.id,
          statement_period_id: openPeriod?.id ?? null,
        },
      ]);

      return ok({
        transfer,
        from_balance_cents: fromAcc.balance_cents - amountCents,
        card_owed_cents: toAcc.balance_cents - amountCents,
      });
    },
  );

  server.registerTool(
    "cashish_list_subscriptions",
    {
      title: "List subscriptions",
      description: "Suscripciones activas/pausadas y qué tarjeta las cobra.",
      inputSchema: z
        .object({
          active_only: z.boolean().default(true),
        })
        .strict(),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ active_only }) => {
      let query = db()
        .from("subscriptions")
        .select("*, accounts(name)")
        .eq("user_id", userId)
        .order("next_billing_on");
      if (active_only) query = query.eq("is_active", true);
      const { data, error } = await query;
      if (error) return fail(error.message);
      return ok(data);
    },
  );

  server.registerTool(
    "cashish_create_subscription",
    {
      title: "Create subscription",
      description: "Crea una suscripción ligada a una cuenta/tarjeta.",
      inputSchema: z
        .object({
          account_id: z.string().uuid(),
          name: z.string().min(1).max(80),
          merchant: z.string().min(1).max(80),
          amount: z.string(),
          frequency: z.enum(["weekly", "monthly", "yearly"]).default("monthly"),
          next_billing_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
          notes: z.string().optional(),
        })
        .strict(),
      annotations: { readOnlyHint: false, openWorldHint: false },
    },
    async (input) => {
      let amountCents: number;
      try {
        amountCents = parseMxnInput(input.amount).amount;
      } catch (e) {
        return fail(e instanceof Error ? e.message : "Monto inválido");
      }
      const { data, error } = await db()
        .from("subscriptions")
        .insert({
          user_id: userId,
          account_id: input.account_id,
          name: input.name,
          merchant: input.merchant,
          amount_cents: amountCents,
          frequency: input.frequency,
          next_billing_on: input.next_billing_on,
          notes: input.notes ?? null,
        })
        .select("*")
        .single();
      if (error) return fail(error.message);
      return ok(data);
    },
  );

  server.registerTool(
    "cashish_list_reminders",
    {
      title: "List reminders",
      description: "Recordatorios pendientes o recientes (corte, pago, suscripciones).",
      inputSchema: z
        .object({
          status: z
            .enum(["pending", "sent", "dismissed", "all"])
            .default("pending"),
          limit: z.number().int().min(1).max(50).default(20),
        })
        .strict(),
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ status, limit }) => {
      let query = db()
        .from("reminders")
        .select("*")
        .eq("user_id", userId)
        .order("due_on")
        .limit(limit);
      if (status !== "all") query = query.eq("status", status);
      const { data, error } = await query;
      if (error) return fail(error.message);
      return ok(data);
    },
  );
}
