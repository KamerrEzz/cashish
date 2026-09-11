import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
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

  return (
    <div>
      <PageHeader
        title="Agentes"
        subtitle="Conecta Cursor, Claude u otros agentes vía MCP con una clave personal."
      />
      <AgentsPanel
        keys={keys ?? []}
        mcpUrl={`${appUrl}/api/mcp`}
      />
    </div>
  );
}
