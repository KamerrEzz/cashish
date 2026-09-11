import { requireProject } from "@/lib/projects";
import { PageHeader, Panel, Mxn } from "@/components/ui";
import { SubscriptionManager } from "@/components/subscription-manager";
import { SubscriptionSuggestions } from "@/components/subscription-suggestions";

export default async function SubscriptionsPage() {
  const { supabase, project } = await requireProject();
  const [{ data: accounts }, { data: subscriptions }] = await Promise.all([
    supabase
      .from("accounts")
      .select("*")
      .eq("project_id", project.id)
      .eq("is_archived", false)
      .order("name"),
    supabase
      .from("subscriptions")
      .select("*, accounts(name)")
      .eq("project_id", project.id)
      .order("next_billing_on"),
  ]);

  const rows = (subscriptions ?? []).map((s) => ({
    ...s,
    accounts:
      s.accounts && typeof s.accounts === "object" && "name" in s.accounts
        ? { name: String((s.accounts as { name: string }).name) }
        : null,
  }));

  const active = rows.filter((s) => s.is_active);
  const monthly = active.reduce((sum, sub) => {
    if (sub.frequency === "yearly") return sum + Math.round(sub.amount_cents / 12);
    if (sub.frequency === "weekly") return sum + Math.round(sub.amount_cents * 4.33);
    return sum + sub.amount_cents;
  }, 0);

  return (
    <div className="dash-enter space-y-6 sm:space-y-8">
      <PageHeader
        title="Suscripciones"
        subtitle="Qué se cobra, con qué cuenta, y cuánto pesa al mes."
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Panel className="!p-4">
          <p className="text-xs text-[var(--muted)]">Activas</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl tabular-nums">
            {active.length}
          </p>
        </Panel>
        <Panel className="!p-4">
          <p className="text-xs text-[var(--muted)]">Costo mensual est.</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl tabular-nums">
            <Mxn cents={monthly} />
          </p>
        </Panel>
        <Panel className="!p-4">
          <p className="text-xs text-[var(--muted)]">Proyección anual</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl tabular-nums">
            <Mxn cents={monthly * 12} />
          </p>
        </Panel>
      </div>

      <SubscriptionSuggestions
        accounts={(accounts ?? []).map((a) => ({ id: a.id, name: a.name }))}
      />
      <SubscriptionManager accounts={accounts ?? []} subscriptions={rows} />
    </div>
  );
}
