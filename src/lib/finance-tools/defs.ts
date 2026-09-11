import { z } from "zod";
import { formatMxn, money, parseMxnInput } from "@/lib/money";
import {
  availableCreditCents,
  buildInitialStatementWindow,
  buildNextStatementWindow,
  todayMexico,
} from "@/lib/credit-cycle";
import type { Database } from "@/lib/database.types";
import type { Admin, CashishToolDef } from "./types";

function parseAmount(raw: string) {
  const cents = parseMxnInput(raw).amount;
  if (cents <= 0) throw new Error("El monto debe ser mayor a 0");
  return cents;
}

const mxnAmount = z
  .string()
  .describe('Monto en MXN con hasta 2 decimales, ej. "229.50"');

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/)
  .describe("Fecha YYYY-MM-DD (America/Mexico_City)");

const accountType = z.enum(["cash", "checking", "savings", "credit_card"]);

async function getOwnedAccount(db: Admin, userId: string, projectId: string, accountId: string) {
  const { data, error } = await db
    .from("accounts")
    .select("*")
    .eq("id", accountId)
    .eq("user_id", userId)
    .eq("project_id", projectId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Cuenta no encontrada o no pertenece al usuario");
  return data;
}

export function buildCashishTools(): CashishToolDef[] {
  return [
  {
    name: "cashish_dashboard",
    title: "Dashboard",
      description:
        "Resumen: liquidez, TDC (deuda/disponible/corte/pago), suscripciones próximas y recordatorios pendientes.",
      inputSchema: z.object({}).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    execute: async (ctx, _args) => {
      const supabase = ctx.db();
      const [
        { data: accounts },
        { data: profiles },
        { data: periods },
        { data: subs },
        { data: reminders },
      ] = await Promise.all([
        supabase
          .from("accounts")
          .select("*")
          .eq("user_id", ctx.userId).eq("project_id", ctx.projectId)
          .eq("is_archived", false),
        supabase.from("credit_card_profiles").select("*").eq("user_id", ctx.userId).eq("project_id", ctx.projectId),
        supabase
          .from("statement_periods")
          .select("*")
          .eq("user_id", ctx.userId).eq("project_id", ctx.projectId)
          .eq("status", "open"),
        supabase
          .from("subscriptions")
          .select("*, accounts(name)")
          .eq("user_id", ctx.userId).eq("project_id", ctx.projectId)
          .eq("is_active", true)
          .order("next_billing_on")
          .limit(10),
        supabase
          .from("reminders")
          .select("*")
          .eq("user_id", ctx.userId).eq("project_id", ctx.projectId)
          .eq("status", "pending")
          .eq("channel", "in_app")
          .order("due_on")
          .limit(10),
      ]);

      const profileBy = new Map((profiles ?? []).map((p) => [p.account_id, p]));
      const periodBy = new Map((periods ?? []).map((p) => [p.account_id, p]));

      return {
        as_of: todayMexico(),
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
              available:
                available != null ? formatMxn(money(available)) : null,
              available_cents: available,
              limit: profile
                ? formatMxn(money(profile.credit_limit_cents))
                : null,
              statement_closes_on: period?.closes_on ?? null,
              payment_due_on: period?.due_on ?? null,
              minimum_payment_cents: profile?.minimum_payment_cents ?? null,
            };
          }),
        upcoming_subscriptions: (subs ?? []).map((s) => ({
          id: s.id,
          name: s.name,
          merchant: s.merchant,
          amount: formatMxn(money(s.amount_cents)),
          amount_cents: s.amount_cents,
          next_billing_on: s.next_billing_on,
          account:
            s.accounts && typeof s.accounts === "object" && "name" in s.accounts
              ? (s.accounts as { name: string }).name
              : null,
        })),
        pending_reminders: reminders ?? [],
      };
    },
  },
  {
    name: "cashish_upcoming_events",
    title: "Upcoming events",
      description:
        "Calendario unificado: cortes, fechas límite de pago y cobros de suscripciones en los próximos N días.",
      inputSchema: z
        .object({
          days: z.number().int().min(1).max(90).default(30),
        })
        .strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    execute: async (ctx, args) => {
      const { days } = args as any;

      const supabase = ctx.db();
      const today = todayMexico();
      const end = new Date(`${today}T12:00:00`);
      end.setDate(end.getDate() + days);
      const endStr = end.toISOString().slice(0, 10);

      const [{ data: periods }, { data: subs }, { data: accounts }] =
        await Promise.all([
          supabase
            .from("statement_periods")
            .select("*, accounts(name)")
            .eq("user_id", ctx.userId).eq("project_id", ctx.projectId)
            .in("status", ["open", "closed"]),
          supabase
            .from("subscriptions")
            .select("*, accounts(name)")
            .eq("user_id", ctx.userId).eq("project_id", ctx.projectId)
            .eq("is_active", true)
            .gte("next_billing_on", today)
            .lte("next_billing_on", endStr)
            .order("next_billing_on"),
          supabase
            .from("accounts")
            .select("id, name")
            .eq("user_id", ctx.userId).eq("project_id", ctx.projectId),
        ]);

      const nameBy = new Map((accounts ?? []).map((a) => [a.id, a.name]));
      type Ev = {
        date: string;
        kind: string;
        title: string;
        meta?: Record<string, unknown>;
      };
      const events: Ev[] = [];

      for (const p of periods ?? []) {
        const accountName =
          p.accounts && typeof p.accounts === "object" && "name" in p.accounts
            ? String((p.accounts as { name: string }).name)
            : nameBy.get(p.account_id) ?? "TDC";
        if (
          p.status === "open" &&
          p.closes_on >= today &&
          p.closes_on <= endStr
        ) {
          events.push({
            date: p.closes_on,
            kind: "statement_close",
            title: `Corte ${accountName}`,
            meta: { statement_id: p.id, account_id: p.account_id },
          });
        }
        if (p.due_on >= today && p.due_on <= endStr) {
          events.push({
            date: p.due_on,
            kind: "payment_due",
            title: `Pago ${accountName}`,
            meta: {
              statement_id: p.id,
              account_id: p.account_id,
              status: p.status,
              closing_balance_cents: p.closing_balance_cents,
              minimum_payment_cents: p.minimum_payment_cents,
            },
          });
        }
      }

      for (const s of subs ?? []) {
        events.push({
          date: s.next_billing_on,
          kind: "subscription_charge",
          title: s.name,
          meta: {
            subscription_id: s.id,
            amount_cents: s.amount_cents,
            account_id: s.account_id,
            merchant: s.merchant,
          },
        });
      }

      events.sort((a, b) => a.date.localeCompare(b.date));
      return { from: today, to: endStr, events };
    },
  },
  {
    name: "cashish_list_accounts",
    title: "List accounts",
      description: "Lista cuentas (efectivo, débito, ahorros, TDC) con perfil de crédito si aplica.",
      inputSchema: z
        .object({ include_archived: z.boolean().default(false) })
        .strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    execute: async (ctx, args) => {
      const { include_archived } = args as any;

      let query = ctx.db()
        .from("accounts")
        .select("*, credit_card_profiles(*)")
        .eq("user_id", ctx.userId).eq("project_id", ctx.projectId)
        .order("created_at");
      if (!include_archived) query = query.eq("is_archived", false);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data;
    },
  },
  {
    name: "cashish_get_account",
    title: "Get account",
      description:
        "Detalle de una cuenta: saldo, perfil TDC, periodo abierto y últimos movimientos.",
      inputSchema: z.object({ account_id: z.string().uuid() }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    execute: async (ctx, args) => {
      const { account_id } = args as any;

      const supabase = ctx.db();
      try {
        const account = await getOwnedAccount(supabase, ctx.userId, ctx.projectId, account_id);
        const [{ data: profile }, { data: openPeriod }, { data: txs }, { data: periods }] =
          await Promise.all([
            account.type === "credit_card"
              ? supabase
                  .from("credit_card_profiles")
                  .select("*")
                  .eq("account_id", account_id)
                  .maybeSingle()
              : Promise.resolve({ data: null }),
            supabase
              .from("statement_periods")
              .select("*")
              .eq("account_id", account_id)
              .eq("status", "open")
              .maybeSingle(),
            supabase
              .from("transactions")
              .select("*")
              .eq("account_id", account_id)
              .order("occurred_on", { ascending: false })
              .limit(15),
            supabase
              .from("statement_periods")
              .select("*")
              .eq("account_id", account_id)
              .order("closes_on", { ascending: false })
              .limit(6),
          ]);

        const available =
          account.type === "credit_card" && profile
            ? availableCreditCents(profile.credit_limit_cents, account.balance_cents)
            : null;

        return {
          account,
          credit_card_profile: profile,
          available_cents: available,
          available:
            available != null ? formatMxn(money(available)) : null,
          open_statement: openPeriod,
          recent_statement_periods: periods,
          recent_transactions: txs,
        };
      } catch (e) {
        throw new Error(e instanceof Error ? e.message : "Error");
      }
    },
  },
  {
    name: "cashish_create_account",
    title: "Create account",
      description:
        "Crea cuenta cash/checking/savings o credit_card. Para TDC exige credit_limit, statement_close_day y payment_due_day (1–28).",
      inputSchema: z
        .object({
          name: z.string().min(1).max(80),
          type: accountType,
          opening_balance: z.string().default("0").describe("Saldo inicial o deuda inicial TDC"),
          credit_limit: z.string().optional(),
          statement_close_day: z.number().int().min(1).max(28).optional(),
          payment_due_day: z.number().int().min(1).max(28).optional(),
          minimum_payment: z.string().optional(),
        })
        .strict(),
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    execute: async (ctx, args) => {
      const input = args as Record<string, any>;

      const supabase = ctx.db();
      let openingCents = 0;
      try {
        openingCents = parseMxnInput(input.opening_balance).amount;
      } catch (e) {
        throw new Error(e instanceof Error ? e.message : "Saldo inválido");
      }

      if (input.type === "credit_card") {
        if (
          input.credit_limit == null ||
          input.statement_close_day == null ||
          input.payment_due_day == null
        ) {
          throw new Error(
            "TDC requiere credit_limit, statement_close_day y payment_due_day",
          );
        }
        let limitCents = 0;
        let minPay = 0;
        try {
          limitCents = parseAmount(input.credit_limit);
          if (input.minimum_payment) {
            minPay = parseMxnInput(input.minimum_payment).amount;
          }
        } catch (e) {
          throw new Error(e instanceof Error ? e.message : "Límite inválido");
        }
        if (openingCents < 0) throw new Error("La deuda inicial no puede ser negativa");

        const { data: account, error } = await supabase
          .from("accounts")
          .insert({
            user_id: ctx.userId,
            project_id: ctx.projectId,
            name: input.name,
            type: "credit_card",
            balance_cents: openingCents,
          })
          .select("*")
          .single();
        if (error || !account) throw new Error(error?.message ?? "No se creó la cuenta");

        const { error: profileError } = await supabase
          .from("credit_card_profiles")
          .insert({
            account_id: account.id,
            user_id: ctx.userId,
            project_id: ctx.projectId,
            credit_limit_cents: limitCents,
            statement_close_day: input.statement_close_day,
            payment_due_day: input.payment_due_day,
            minimum_payment_cents: minPay,
          });
        if (profileError) {
          await supabase.from("accounts").delete().eq("id", account.id);
          throw new Error(profileError.message);
        }

        const window = buildInitialStatementWindow(
          input.statement_close_day,
          input.payment_due_day,
        );
        const { data: period, error: periodError } = await supabase
          .from("statement_periods")
          .insert({
            user_id: ctx.userId,
            project_id: ctx.projectId,
            account_id: account.id,
            opens_on: window.opensOn,
            closes_on: window.closesOn,
            due_on: window.dueOn,
            opening_balance_cents: openingCents,
            minimum_payment_cents: minPay,
            status: "open",
          })
          .select("*")
          .single();
        if (periodError) throw new Error(periodError.message);

        return { account, open_statement: period };
      }

      const { data: account, error } = await supabase
        .from("accounts")
        .insert({
          user_id: ctx.userId,
            project_id: ctx.projectId,
          name: input.name,
          type: input.type,
          balance_cents: openingCents,
        })
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return { account };
    },
  },
  {
    name: "cashish_rename_account",
    title: "Rename account",
      description: "Cambia el nombre visible de una cuenta.",
      inputSchema: z
        .object({
          account_id: z.string().uuid(),
          name: z.string().min(1).max(80),
        })
        .strict(),
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    execute: async (ctx, args) => {
      const { account_id, name } = args as any;

      const { data, error } = await ctx.db()
        .from("accounts")
        .update({ name, updated_at: new Date().toISOString() })
        .eq("id", account_id)
        .eq("user_id", ctx.userId).eq("project_id", ctx.projectId)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
  },
  {
    name: "cashish_archive_account",
    title: "Archive account",
      description: "Archiva una cuenta (deja de aparecer en listados activos).",
      inputSchema: z.object({ account_id: z.string().uuid() }).strict(),
      annotations: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
    execute: async (ctx, args) => {
      const { account_id } = args as any;

      const { data, error } = await ctx.db()
        .from("accounts")
        .update({ is_archived: true, updated_at: new Date().toISOString() })
        .eq("id", account_id)
        .eq("user_id", ctx.userId).eq("project_id", ctx.projectId)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
  },
  {
    name: "cashish_update_credit_card_profile",
    title: "Update credit card profile",
      description:
        "Actualiza límite, día de corte, día de pago y/o pago mínimo de una TDC.",
      inputSchema: z
        .object({
          account_id: z.string().uuid(),
          credit_limit: z.string().optional(),
          statement_close_day: z.number().int().min(1).max(28).optional(),
          payment_due_day: z.number().int().min(1).max(28).optional(),
          minimum_payment: z.string().optional(),
        })
        .strict(),
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    execute: async (ctx, args) => {
      const input = args as Record<string, any>;

      const patch: Record<string, number> = {};
      try {
        if (input.credit_limit != null) {
          patch.credit_limit_cents = parseAmount(input.credit_limit);
        }
        if (input.minimum_payment != null) {
          patch.minimum_payment_cents = parseMxnInput(input.minimum_payment).amount;
        }
      } catch (e) {
        throw new Error(e instanceof Error ? e.message : "Monto inválido");
      }
      if (input.statement_close_day != null) {
        patch.statement_close_day = input.statement_close_day;
      }
      if (input.payment_due_day != null) {
        patch.payment_due_day = input.payment_due_day;
      }
      if (Object.keys(patch).length === 0) {
        throw new Error("No hay campos para actualizar");
      }
      const { data, error } = await ctx.db()
        .from("credit_card_profiles")
        .update({
          ...patch,
          updated_at: new Date().toISOString(),
        })
        .eq("account_id", input.account_id)
        .eq("user_id", ctx.userId).eq("project_id", ctx.projectId)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
  },
  {
    name: "cashish_list_transactions",
    title: "List transactions",
      description: "Lista movimientos con filtros opcionales por cuenta, tipo y rango de fechas.",
      inputSchema: z
        .object({
          account_id: z.string().uuid().optional(),
          type: z.enum(["expense", "income", "transfer"]).optional(),
          from_date: isoDate.optional(),
          to_date: isoDate.optional(),
          limit: z.number().int().min(1).max(100).default(25),
        })
        .strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    execute: async (ctx, args) => {
      const { account_id, type, from_date, to_date, limit } = args as any;

      let query = ctx.db()
        .from("transactions")
        .select("*, accounts(name)")
        .eq("user_id", ctx.userId).eq("project_id", ctx.projectId)
        .order("occurred_on", { ascending: false })
        .limit(limit);
      if (account_id) query = query.eq("account_id", account_id);
      if (type) query = query.eq("type", type);
      if (from_date) query = query.gte("occurred_on", from_date);
      if (to_date) query = query.lte("occurred_on", to_date);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data;
    },
  },
  {
    name: "cashish_search_transactions",
    title: "Search transactions",
      description: "Busca movimientos por comercio, descripción o categoría (texto parcial).",
      inputSchema: z
        .object({
          query: z.string().min(1).max(80),
          account_id: z.string().uuid().optional(),
          limit: z.number().int().min(1).max(50).default(25),
        })
        .strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    execute: async (ctx, args) => {
      const { query: q, account_id, limit } = args as any;

      const pattern = `%${q}%`;
      let query = ctx.db()
        .from("transactions")
        .select("*, accounts(name)")
        .eq("user_id", ctx.userId).eq("project_id", ctx.projectId)
        .or(
          `merchant.ilike.${pattern},description.ilike.${pattern},category.ilike.${pattern}`,
        )
        .order("occurred_on", { ascending: false })
        .limit(limit);
      if (account_id) query = query.eq("account_id", account_id);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data;
    },
  },
  {
    name: "cashish_get_transaction",
    title: "Get transaction",
      description: "Obtiene un movimiento por id.",
      inputSchema: z.object({ transaction_id: z.string().uuid() }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    execute: async (ctx, args) => {
      const { transaction_id } = args as any;

      const { data, error } = await ctx.db()
        .from("transactions")
        .select("*, accounts(name)")
        .eq("id", transaction_id)
        .eq("user_id", ctx.userId).eq("project_id", ctx.projectId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) throw new Error("Movimiento no encontrado");
      return data;
    },
  },
  {
    name: "cashish_create_transaction",
    title: "Create income or expense",
      description:
        "Registra ingreso o gasto. En TDC, expense aumenta la deuda; income la reduce (reembolso).",
      inputSchema: z
        .object({
          account_id: z.string().uuid(),
          type: z.enum(["expense", "income"]),
          amount: mxnAmount,
          merchant: z.string().optional(),
          description: z.string().optional(),
          category: z.string().optional(),
          occurred_on: isoDate.optional(),
          subscription_id: z.string().uuid().optional(),
        })
        .strict(),
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    execute: async (ctx, args) => {
      const input = args as Record<string, any>;

      let amountCents: number;
      try {
        amountCents = parseAmount(input.amount);
      } catch (e) {
        throw new Error(e instanceof Error ? e.message : "Monto inválido");
      }

      const supabase = ctx.db();
      try {
        const account = await getOwnedAccount(supabase, ctx.userId, ctx.projectId, input.account_id,
        );

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
            user_id: ctx.userId,
            project_id: ctx.projectId,
            account_id: account.id,
            type: input.type,
            amount_cents: amountCents,
            merchant: input.merchant ?? null,
            description: input.description ?? null,
            category: input.category ?? null,
            occurred_on: input.occurred_on ?? todayMexico(),
            statement_period_id: statementPeriodId,
            subscription_id: input.subscription_id ?? null,
          })
          .select("*")
          .single();
        if (txError) throw new Error(txError.message);

        const { error: balError } = await supabase
          .from("accounts")
          .update({
            balance_cents: nextBalance,
            updated_at: new Date().toISOString(),
          })
          .eq("id", account.id);
        if (balError) throw new Error(balError.message);

        return {
          transaction: tx,
          new_balance_cents: nextBalance,
          new_balance: formatMxn(money(nextBalance)),
        };
      } catch (e) {
        throw new Error(e instanceof Error ? e.message : "Error");
      }
    },
  },
  {
    name: "cashish_list_transfers",
    title: "List transfers",
      description: "Lista transferencias vinculadas (incl. pagos a TDC).",
      inputSchema: z
        .object({ limit: z.number().int().min(1).max(50).default(20) })
        .strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    execute: async (ctx, args) => {
      const { limit } = args as any;

      const { data, error } = await ctx.db()
        .from("transfers")
        .select("*")
        .eq("user_id", ctx.userId).eq("project_id", ctx.projectId)
        .order("occurred_on", { ascending: false })
        .limit(limit);
      if (error) throw new Error(error.message);
      return data;
    },
  },
  {
    name: "cashish_create_transfer",
    title: "Create transfer",
      description:
        "Transferencia entre dos cuentas propias. Si el destino es TDC, reduce la deuda (pago).",
      inputSchema: z
        .object({
          from_account_id: z.string().uuid(),
          to_account_id: z.string().uuid(),
          amount: mxnAmount,
          note: z.string().optional(),
          occurred_on: isoDate.optional(),
        })
        .strict(),
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    execute: async (ctx, args) => {
      const input = args as Record<string, any>;

      let amountCents: number;
      try {
        amountCents = parseAmount(input.amount);
      } catch (e) {
        throw new Error(e instanceof Error ? e.message : "Monto inválido");
      }
      if (input.from_account_id === input.to_account_id) {
        throw new Error("Las cuentas de origen y destino deben ser distintas");
      }

      const supabase = ctx.db();
      try {
        const fromAcc = await getOwnedAccount(supabase, ctx.userId, ctx.projectId, input.from_account_id,
        );
        const toAcc = await getOwnedAccount(supabase, ctx.userId, ctx.projectId, input.to_account_id,
        );
        if (fromAcc.type === "credit_card") {
          throw new Error("No se puede transferir desde una TDC en el MVP");
        }

        const occurred = input.occurred_on ?? todayMexico();
        const note = input.note ?? "Transferencia";

        const { data: transfer, error: transferError } = await supabase
          .from("transfers")
          .insert({
            user_id: ctx.userId,
            project_id: ctx.projectId,
            from_account_id: fromAcc.id,
            to_account_id: toAcc.id,
            amount_cents: amountCents,
            occurred_on: occurred,
            note,
          })
          .select("*")
          .single();
        if (transferError) throw new Error(transferError.message);

        const fromNext = fromAcc.balance_cents - amountCents;
        const toNext =
          toAcc.type === "credit_card"
            ? toAcc.balance_cents - amountCents
            : toAcc.balance_cents + amountCents;

        await supabase
          .from("accounts")
          .update({
            balance_cents: fromNext,
            updated_at: new Date().toISOString(),
          })
          .eq("id", fromAcc.id);
        await supabase
          .from("accounts")
          .update({
            balance_cents: toNext,
            updated_at: new Date().toISOString(),
          })
          .eq("id", toAcc.id);

        let openPeriodId: string | null = null;
        if (toAcc.type === "credit_card") {
          const { data: openPeriod } = await supabase
            .from("statement_periods")
            .select("id")
            .eq("account_id", toAcc.id)
            .eq("status", "open")
            .maybeSingle();
          openPeriodId = openPeriod?.id ?? null;
        }

        await supabase.from("transactions").insert([
          {
            user_id: ctx.userId,
            project_id: ctx.projectId,
            account_id: fromAcc.id,
            type: "transfer",
            amount_cents: amountCents,
            description: note,
            occurred_on: occurred,
            transfer_id: transfer.id,
          },
          {
            user_id: ctx.userId,
            project_id: ctx.projectId,
            account_id: toAcc.id,
            type: "transfer",
            amount_cents: amountCents,
            description: note,
            occurred_on: occurred,
            transfer_id: transfer.id,
            statement_period_id: openPeriodId,
          },
        ]);

        return {
          transfer,
          from_balance_cents: fromNext,
          to_balance_cents: toNext,
          to_is_credit_card: toAcc.type === "credit_card",
        };
      } catch (e) {
        throw new Error(e instanceof Error ? e.message : "Error");
      }
    },
  },
  {
    name: "cashish_pay_credit_card",
    title: "Pay credit card",
      description:
        "Atajo de pago a TDC (transferencia vinculada desde cuenta líquida).",
      inputSchema: z
        .object({
          from_account_id: z.string().uuid(),
          credit_card_account_id: z.string().uuid(),
          amount: mxnAmount,
          note: z.string().optional(),
          occurred_on: isoDate.optional(),
        })
        .strict(),
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    execute: async (ctx, args) => {
      const input = args as Record<string, any>;

      // Reuse create_transfer semantics by calling the same path via nested registration is awkward;
      // duplicate thin wrapper by invoking transfer logic through create_transfer tool body.
      const supabase = ctx.db();
      let amountCents: number;
      try {
        amountCents = parseAmount(input.amount);
      } catch (e) {
        throw new Error(e instanceof Error ? e.message : "Monto inválido");
      }
      try {
        const fromAcc = await getOwnedAccount(supabase, ctx.userId, ctx.projectId, input.from_account_id,
        );
        const toAcc = await getOwnedAccount(supabase, ctx.userId, ctx.projectId, input.credit_card_account_id,
        );
        if (fromAcc.type === "credit_card") {
          throw new Error("No se puede pagar desde una TDC");
        }
        if (toAcc.type !== "credit_card") {
          throw new Error("credit_card_account_id debe ser una tarjeta de crédito");
        }

        const occurred = input.occurred_on ?? todayMexico();
        const note = input.note ?? "Pago tarjeta";

        const { data: transfer, error: transferError } = await supabase
          .from("transfers")
          .insert({
            user_id: ctx.userId,
            project_id: ctx.projectId,
            from_account_id: fromAcc.id,
            to_account_id: toAcc.id,
            amount_cents: amountCents,
            occurred_on: occurred,
            note,
          })
          .select("*")
          .single();
        if (transferError) throw new Error(transferError.message);

        const fromNext = fromAcc.balance_cents - amountCents;
        const cardNext = toAcc.balance_cents - amountCents;

        await supabase
          .from("accounts")
          .update({
            balance_cents: fromNext,
            updated_at: new Date().toISOString(),
          })
          .eq("id", fromAcc.id);
        await supabase
          .from("accounts")
          .update({
            balance_cents: cardNext,
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
            user_id: ctx.userId,
            project_id: ctx.projectId,
            account_id: fromAcc.id,
            type: "transfer",
            amount_cents: amountCents,
            description: note,
            occurred_on: occurred,
            transfer_id: transfer.id,
          },
          {
            user_id: ctx.userId,
            project_id: ctx.projectId,
            account_id: toAcc.id,
            type: "transfer",
            amount_cents: amountCents,
            description: note,
            occurred_on: occurred,
            transfer_id: transfer.id,
            statement_period_id: openPeriod?.id ?? null,
          },
        ]);

        return {
          transfer,
          from_balance_cents: fromNext,
          card_owed_cents: cardNext,
          card_owed: formatMxn(money(cardNext)),
        };
      } catch (e) {
        throw new Error(e instanceof Error ? e.message : "Error");
      }
    },
  },
  {
    name: "cashish_list_statement_periods",
    title: "List statement periods",
      description: "Historial de periodos de estado de cuenta de una TDC.",
      inputSchema: z
        .object({
          account_id: z.string().uuid(),
          status: z.enum(["open", "closed", "paid", "all"]).default("all"),
          limit: z.number().int().min(1).max(24).default(12),
        })
        .strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    execute: async (ctx, args) => {
      const { account_id, status, limit } = args as any;

      let query = ctx.db()
        .from("statement_periods")
        .select("*")
        .eq("user_id", ctx.userId).eq("project_id", ctx.projectId)
        .eq("account_id", account_id)
        .order("closes_on", { ascending: false })
        .limit(limit);
      if (status !== "all") query = query.eq("status", status);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data;
    },
  },
  {
    name: "cashish_get_open_statement",
    title: "Get open statement",
      description:
        "Periodo abierto de una TDC con cargos/pagos del ciclo y totales.",
      inputSchema: z.object({ account_id: z.string().uuid() }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    execute: async (ctx, args) => {
      const { account_id } = args as any;

      const supabase = ctx.db();
      const { data: period, error } = await supabase
        .from("statement_periods")
        .select("*")
        .eq("user_id", ctx.userId).eq("project_id", ctx.projectId)
        .eq("account_id", account_id)
        .eq("status", "open")
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!period) throw new Error("No hay periodo abierto para esta tarjeta");

      const { data: txs } = await supabase
        .from("transactions")
        .select("*")
        .eq("statement_period_id", period.id)
        .order("occurred_on");

      const charges = (txs ?? []).filter((t) => t.type === "expense");
      const payments = (txs ?? []).filter((t) => t.type === "transfer");
      const chargeTotal = charges.reduce((s, t) => s + t.amount_cents, 0);
      const paymentTotal = payments.reduce((s, t) => s + t.amount_cents, 0);

      return {
        period,
        transactions: txs,
        charge_total_cents: chargeTotal,
        payment_total_cents: paymentTotal,
        charge_total: formatMxn(money(chargeTotal)),
        payment_total: formatMxn(money(paymentTotal)),
      };
    },
  },
  {
    name: "cashish_close_statement",
    title: "Close statement period",
      description:
        "Cierra el corte actual (snapshot del saldo) y abre el siguiente ciclo.",
      inputSchema: z
        .object({
          account_id: z.string().uuid(),
          minimum_payment: z.string().optional(),
        })
        .strict(),
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    execute: async (ctx, args) => {
      const { account_id, minimum_payment } = args as any;

      const supabase = ctx.db();
      try {
        const account = await getOwnedAccount(supabase, ctx.userId, ctx.projectId, account_id);
        if (account.type !== "credit_card") {
          throw new Error("Solo aplica a tarjetas de crédito");
        }

        const { data: profile } = await supabase
          .from("credit_card_profiles")
          .select("*")
          .eq("account_id", account_id)
          .eq("user_id", ctx.userId).eq("project_id", ctx.projectId)
          .single();
        if (!profile) throw new Error("Perfil de TDC no encontrado");

        const { data: period } = await supabase
          .from("statement_periods")
          .select("*")
          .eq("account_id", account_id)
          .eq("status", "open")
          .single();
        if (!period) throw new Error("No hay periodo abierto");

        let minPay = profile.minimum_payment_cents;
        if (minimum_payment != null && minimum_payment.trim() !== "") {
          try {
            minPay = parseMxnInput(minimum_payment).amount;
          } catch (e) {
            throw new Error(e instanceof Error ? e.message : "Pago mínimo inválido");
          }
        }

        const { data: closed, error: closeError } = await supabase
          .from("statement_periods")
          .update({
            status: "closed",
            closing_balance_cents: account.balance_cents,
            minimum_payment_cents: minPay,
            closed_at: new Date().toISOString(),
          })
          .eq("id", period.id)
          .select("*")
          .single();
        if (closeError) throw new Error(closeError.message);

        const next = buildNextStatementWindow(
          period.closes_on,
          profile.statement_close_day,
          profile.payment_due_day,
        );

        const { data: opened, error: openError } = await supabase
          .from("statement_periods")
          .insert({
            user_id: ctx.userId,
            project_id: ctx.projectId,
            account_id,
            opens_on: next.opensOn,
            closes_on: next.closesOn,
            due_on: next.dueOn,
            opening_balance_cents: account.balance_cents,
            minimum_payment_cents: profile.minimum_payment_cents,
            status: "open",
          })
          .select("*")
          .single();
        if (openError) throw new Error(openError.message);

        return {
          closed_statement: closed,
          new_open_statement: opened,
          closing_balance: formatMxn(money(account.balance_cents)),
        };
      } catch (e) {
        throw new Error(e instanceof Error ? e.message : "Error");
      }
    },
  },
  {
    name: "cashish_mark_statement_paid",
    title: "Mark statement paid",
      description: "Marca un estado de cuenta cerrado como pagado.",
      inputSchema: z
        .object({ statement_id: z.string().uuid() })
        .strict(),
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    execute: async (ctx, args) => {
      const { statement_id } = args as any;

      const { data, error } = await ctx.db()
        .from("statement_periods")
        .update({ status: "paid" })
        .eq("id", statement_id)
        .eq("user_id", ctx.userId).eq("project_id", ctx.projectId)
        .eq("status", "closed")
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
  },
  {
    name: "cashish_list_subscriptions",
    title: "List subscriptions",
      description: "Suscripciones y la tarjeta/cuenta que las cobra.",
      inputSchema: z
        .object({
          active_only: z.boolean().default(true),
          account_id: z.string().uuid().optional(),
        })
        .strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    execute: async (ctx, args) => {
      const { active_only, account_id } = args as any;

      let query = ctx.db()
        .from("subscriptions")
        .select("*, accounts(name)")
        .eq("user_id", ctx.userId).eq("project_id", ctx.projectId)
        .order("next_billing_on");
      if (active_only) query = query.eq("is_active", true);
      if (account_id) query = query.eq("account_id", account_id);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data;
    },
  },
  {
    name: "cashish_get_subscription",
    title: "Get subscription",
      description: "Detalle de una suscripción.",
      inputSchema: z.object({ subscription_id: z.string().uuid() }).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    execute: async (ctx, args) => {
      const { subscription_id } = args as any;

      const { data, error } = await ctx.db()
        .from("subscriptions")
        .select("*, accounts(name)")
        .eq("id", subscription_id)
        .eq("user_id", ctx.userId).eq("project_id", ctx.projectId)
        .maybeSingle();
      if (error) throw new Error(error.message);
      if (!data) throw new Error("Suscripción no encontrada");
      return data;
    },
  },
  {
    name: "cashish_create_subscription",
    title: "Create subscription",
      description: "Crea suscripción ligada a una cuenta/tarjeta.",
      inputSchema: z
        .object({
          account_id: z.string().uuid(),
          name: z.string().min(1).max(80),
          merchant: z.string().min(1).max(80),
          amount: mxnAmount,
          frequency: z.enum(["weekly", "monthly", "yearly"]).default("monthly"),
          next_billing_on: isoDate,
          notes: z.string().optional(),
        })
        .strict(),
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    execute: async (ctx, args) => {
      const input = args as Record<string, any>;

      let amountCents: number;
      try {
        amountCents = parseAmount(input.amount);
      } catch (e) {
        throw new Error(e instanceof Error ? e.message : "Monto inválido");
      }
      try {
        await getOwnedAccount(ctx.db(), ctx.userId, ctx.projectId, input.account_id);
      } catch (e) {
        throw new Error(e instanceof Error ? e.message : "Cuenta inválida");
      }
      const { data, error } = await ctx.db()
        .from("subscriptions")
        .insert({
          user_id: ctx.userId,
            project_id: ctx.projectId,
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
      if (error) throw new Error(error.message);
      return data;
    },
  },
  {
    name: "cashish_update_subscription",
    title: "Update subscription",
      description:
        "Actualiza monto, tarjeta, frecuencia, próximo cobro, nombre o notas.",
      inputSchema: z
        .object({
          subscription_id: z.string().uuid(),
          account_id: z.string().uuid().optional(),
          name: z.string().min(1).max(80).optional(),
          merchant: z.string().min(1).max(80).optional(),
          amount: mxnAmount.optional(),
          frequency: z.enum(["weekly", "monthly", "yearly"]).optional(),
          next_billing_on: isoDate.optional(),
          notes: z.string().nullable().optional(),
        })
        .strict(),
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    execute: async (ctx, args) => {
      const input = args as Record<string, any>;

      const patch: Database["public"]["Tables"]["subscriptions"]["Update"] = {
        updated_at: new Date().toISOString(),
      };
      try {
        if (input.amount != null) patch.amount_cents = parseAmount(input.amount);
      } catch (e) {
        throw new Error(e instanceof Error ? e.message : "Monto inválido");
      }
      if (input.account_id) {
        try {
          await getOwnedAccount(ctx.db(), ctx.userId, ctx.projectId, input.account_id);
          patch.account_id = input.account_id;
        } catch (e) {
          throw new Error(e instanceof Error ? e.message : "Cuenta inválida");
        }
      }
      if (input.name != null) patch.name = input.name;
      if (input.merchant != null) patch.merchant = input.merchant;
      if (input.frequency != null) patch.frequency = input.frequency;
      if (input.next_billing_on != null) {
        patch.next_billing_on = input.next_billing_on;
      }
      if (input.notes !== undefined) patch.notes = input.notes;

      const { data, error } = await ctx.db()
        .from("subscriptions")
        .update(patch)
        .eq("id", input.subscription_id)
        .eq("user_id", ctx.userId).eq("project_id", ctx.projectId)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
  },
  {
    name: "cashish_toggle_subscription",
    title: "Pause or resume subscription",
      description: "Activa o pausa una suscripción.",
      inputSchema: z
        .object({
          subscription_id: z.string().uuid(),
          is_active: z.boolean(),
        })
        .strict(),
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    execute: async (ctx, args) => {
      const { subscription_id, is_active } = args as any;

      const { data, error } = await ctx.db()
        .from("subscriptions")
        .update({
          is_active,
          updated_at: new Date().toISOString(),
        })
        .eq("id", subscription_id)
        .eq("user_id", ctx.userId).eq("project_id", ctx.projectId)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
  },
  {
    name: "cashish_list_reminders",
    title: "List reminders",
      description: "Recordatorios de corte, pago y suscripciones.",
      inputSchema: z
        .object({
          status: z
            .enum(["pending", "sent", "dismissed", "all"])
            .default("pending"),
          channel: z.enum(["in_app", "email", "all"]).default("all"),
          limit: z.number().int().min(1).max(50).default(20),
        })
        .strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    execute: async (ctx, args) => {
      const { status, channel, limit } = args as any;

      let query = ctx.db()
        .from("reminders")
        .select("*")
        .eq("user_id", ctx.userId).eq("project_id", ctx.projectId)
        .order("due_on")
        .limit(limit);
      if (status !== "all") query = query.eq("status", status);
      if (channel !== "all") query = query.eq("channel", channel);
      const { data, error } = await query;
      if (error) throw new Error(error.message);
      return data;
    },
  },
  {
    name: "cashish_dismiss_reminder",
    title: "Dismiss reminder",
      description: "Marca un recordatorio in-app como descartado.",
      inputSchema: z.object({ reminder_id: z.string().uuid() }).strict(),
      annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: false },
    execute: async (ctx, args) => {
      const { reminder_id } = args as any;

      const { data, error } = await ctx.db()
        .from("reminders")
        .update({ status: "dismissed" })
        .eq("id", reminder_id)
        .eq("user_id", ctx.userId).eq("project_id", ctx.projectId)
        .select("*")
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
  },
  {
    name: "cashish_list_tools_help",
    title: "List Cashish MCP capabilities",
      description:
        "Catálogo breve de herramientas MCP de Cashish y cuándo usarlas.",
      inputSchema: z.object({}).strict(),
      annotations: { readOnlyHint: true, destructiveHint: false, openWorldHint: false },
    execute: async (_ctx, _args) => {
      return {
        overview: [
          "cashish_dashboard",
          "cashish_upcoming_events",
          "cashish_list_tools_help",
        ],
        accounts: [
          "cashish_list_accounts",
          "cashish_get_account",
          "cashish_create_account",
          "cashish_rename_account",
          "cashish_archive_account",
          "cashish_update_credit_card_profile",
        ],
        transactions: [
          "cashish_list_transactions",
          "cashish_search_transactions",
          "cashish_get_transaction",
          "cashish_create_transaction",
        ],
        transfers: [
          "cashish_list_transfers",
          "cashish_create_transfer",
          "cashish_pay_credit_card",
        ],
        statements: [
          "cashish_list_statement_periods",
          "cashish_get_open_statement",
          "cashish_close_statement",
          "cashish_mark_statement_paid",
        ],
        subscriptions: [
          "cashish_list_subscriptions",
          "cashish_get_subscription",
          "cashish_create_subscription",
          "cashish_update_subscription",
          "cashish_toggle_subscription",
        ],
        reminders: ["cashish_list_reminders", "cashish_dismiss_reminder"],
        notes: [
          "Montos siempre como string MXN con hasta 2 decimales.",
          "TDC: balance_cents = deuda (owed). available = limit - owed.",
          "Pagos a tarjeta: preferir cashish_pay_credit_card o create_transfer hacia la TDC.",
        ],
      };
    },
  }
  ];
}
