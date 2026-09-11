import { requireProject } from "@/lib/projects";
import { todayMexico } from "@/lib/credit-cycle";
import { PageHeader } from "@/components/ui";
import { BudgetForm } from "@/components/budget-form";

function monthBounds(todayIso: string) {
  const [y, m] = todayIso.split("-").map(Number);
  const start = `${y}-${String(m).padStart(2, "0")}-01`;
  const endDate = new Date(y, m, 0);
  const end = `${y}-${String(m).padStart(2, "0")}-${String(endDate.getDate()).padStart(2, "0")}`;
  return { start, end };
}

export default async function BudgetsPage() {
  const { supabase, project } = await requireProject();
  const today = todayMexico();
  const { start, end } = monthBounds(today);

  const [{ data: budgets }, { data: txs }] = await Promise.all([
    supabase
      .from("budgets")
      .select("*")
      .eq("project_id", project.id)
      .eq("is_active", true)
      .order("name"),
    supabase
      .from("transactions")
      .select("amount_cents, category, type, transfer_id")
      .eq("project_id", project.id)
      .eq("type", "expense")
      .is("transfer_id", null)
      .gte("occurred_on", start)
      .lte("occurred_on", end),
  ]);

  const spentByCategory = new Map<string, number>();
  for (const tx of txs ?? []) {
    const key = (tx.category ?? "").trim().toLowerCase();
    if (!key) continue;
    spentByCategory.set(key, (spentByCategory.get(key) ?? 0) + tx.amount_cents);
  }

  const rows = (budgets ?? []).map((b) => {
    const catKey = (b.category ?? b.name).trim().toLowerCase();
    return {
      id: b.id,
      name: b.name,
      category: b.category,
      monthly_limit_cents: b.monthly_limit_cents,
      spentCents: spentByCategory.get(catKey) ?? 0,
    };
  });

  return (
    <div className="dash-enter space-y-6 sm:space-y-8">
      <PageHeader
        title="Presupuestos"
        subtitle="Sobres mensuales por categoría — gasto del mes en curso."
      />
      <BudgetForm budgets={rows} />
    </div>
  );
}
