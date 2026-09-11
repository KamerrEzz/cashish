import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { SubscriptionManager } from "@/components/subscription-manager";

export default async function SubscriptionsPage() {
  const { supabase } = await requireUser();
  const [{ data: accounts }, { data: subscriptions }] = await Promise.all([
    supabase
      .from("accounts")
      .select("*")
      .eq("is_archived", false)
      .order("name"),
    supabase
      .from("subscriptions")
      .select("*, accounts(name)")
      .order("next_billing_on"),
  ]);

  const rows = (subscriptions ?? []).map((s) => ({
    ...s,
    accounts:
      s.accounts && typeof s.accounts === "object" && "name" in s.accounts
        ? { name: String((s.accounts as { name: string }).name) }
        : null,
  }));

  return (
    <div>
      <PageHeader
        title="Suscripciones"
        subtitle="Qué servicio cobra qué tarjeta y cuándo toca el siguiente cobro."
      />
      <SubscriptionManager accounts={accounts ?? []} subscriptions={rows} />
    </div>
  );
}
