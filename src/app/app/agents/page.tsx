import { requireUser } from "@/lib/auth";
import { PageHeader, Panel } from "@/components/ui";
import { AgentsPanel } from "@/components/agents-panel";

export default async function AgentsPage() {
  const { supabase } = await requireUser();
  const { data: keys } = await supabase
    .from("mcp_api_keys")
    .select("id, name, key_prefix, last_used_at, revoked_at, created_at")
    .order("created_at", { ascending: false });

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "https://cashish-beta.vercel.app";

  const active = (keys ?? []).filter((k) => !k.revoked_at).length;

  return (
    <div className="dash-enter space-y-8">
      <PageHeader
        title="Agentes"
        subtitle="MCP para que agentes de IA lean y actúen sobre tus finanzas."
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <Panel className="!p-4">
          <p className="text-xs text-[var(--muted)]">Claves activas</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl tabular-nums">
            {active}
          </p>
        </Panel>
        <Panel className="!p-4">
          <p className="text-xs text-[var(--muted)]">Endpoint</p>
          <p className="mt-1 truncate font-mono text-xs text-[var(--ink)]">
            {appUrl}/api/mcp
          </p>
        </Panel>
      </div>
      <AgentsPanel keys={keys ?? []} mcpUrl={`${appUrl}/api/mcp`} />
    </div>
  );
}
