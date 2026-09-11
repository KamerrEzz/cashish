import { requireUser } from "@/lib/auth";
import { PageHeader, Panel } from "@/components/ui";
import { AgentsPanel } from "@/components/agents-panel";
import { AiKeyForm } from "@/components/ai/ai-key-form";
import { getUserAiMeta } from "@/lib/ai/user-key";
import { SectionTitle } from "@/components/empty-state";

export default async function AgentsPage() {
  const { supabase } = await requireUser();
  const [{ data: keys }, aiMeta] = await Promise.all([
    supabase
      .from("mcp_api_keys")
      .select("id, name, key_prefix, last_used_at, revoked_at, created_at")
      .order("created_at", { ascending: false }),
    getUserAiMeta(supabase),
  ]);

  const appUrl =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
    "https://cashish-beta.vercel.app";

  const active = (keys ?? []).filter((k) => !k.revoked_at).length;

  return (
    <div className="dash-enter space-y-8">
      <PageHeader
        title="Agentes"
        subtitle="Clave del modelo (BYOK) para el asistente in-app, y claves MCP para agentes externos."
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <Panel className="!p-4">
          <p className="text-xs text-[var(--muted)]">Modelo BYOK</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-lg text-[var(--ink)]">
            {aiMeta.configured ? `…${aiMeta.last4}` : "Sin clave"}
          </p>
        </Panel>
        <Panel className="!p-4">
          <p className="text-xs text-[var(--muted)]">Claves MCP activas</p>
          <p className="mt-1 font-[family-name:var(--font-display)] text-2xl tabular-nums">
            {active}
          </p>
        </Panel>
        <Panel className="!p-4">
          <p className="text-xs text-[var(--muted)]">Endpoint MCP</p>
          <p className="mt-1 truncate font-mono text-xs text-[var(--ink)]">
            {appUrl}/api/mcp
          </p>
        </Panel>
      </div>

      <Panel>
        <SectionTitle
          title="Clave de modelo (BYOK)"
          subtitle="Para el Asistente en /app/ai — no es una clave MCP"
        />
        <AiKeyForm />
      </Panel>

      <AgentsPanel keys={keys ?? []} mcpUrl={`${appUrl}/api/mcp`} />
    </div>
  );
}

