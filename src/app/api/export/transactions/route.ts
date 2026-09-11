import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { todayMexico } from "@/lib/credit-cycle";
import {
  TX_EXPORT_MAX,
  buildExportFilename,
  parseTransactionFilters,
  resolveDateRange,
  transactionsToCsv,
  type ExportRow,
} from "@/lib/transactions-query";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const filters = parseTransactionFilters(url.searchParams);
  const today = todayMexico();
  const range = resolveDateRange(filters, today);

  let query = supabase
    .from("transactions")
    .select(
      "id, type, amount_cents, currency, merchant, description, category, occurred_on, transfer_id, accounts(name)",
    )
    .eq("user_id", user.id)
    .gte("occurred_on", range.from)
    .lte("occurred_on", range.to)
    .order("occurred_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(TX_EXPORT_MAX);

  if (filters.accountId) {
    query = query.eq("account_id", filters.accountId);
  }
  if (filters.category) {
    query = query.ilike("category", `%${filters.category}%`);
  }
  if (filters.type === "expense") {
    query = query.eq("type", "expense").is("transfer_id", null);
  } else if (filters.type === "income") {
    query = query.eq("type", "income").is("transfer_id", null);
  } else if (filters.type === "transfer") {
    query = query.not("transfer_id", "is", null);
  }
  if (filters.q) {
    const q = filters.q.replace(/[%_]/g, "");
    query = query.or(
      `merchant.ilike.%${q}%,description.ilike.%${q}%,category.ilike.%${q}%`,
    );
  }

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const rows: ExportRow[] = (data ?? []).map((row) => {
    const accountName =
      row.accounts &&
      typeof row.accounts === "object" &&
      "name" in row.accounts
        ? String((row.accounts as { name: string }).name)
        : "";
    return {
      occurred_on: row.occurred_on,
      type: row.type,
      transfer_id: row.transfer_id,
      account_name: accountName,
      merchant: row.merchant,
      description: row.description,
      category: row.category,
      amount_cents: row.amount_cents,
      currency: row.currency,
      id: row.id,
    };
  });

  const csv = transactionsToCsv(rows);
  const filename = buildExportFilename(range.from, range.to, today);

  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
