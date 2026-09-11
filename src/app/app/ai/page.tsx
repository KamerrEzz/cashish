import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { AiChat } from "@/components/ai/ai-chat";
import { AiKeyGate } from "@/components/ai/ai-key-gate";
import { AiSidebar } from "@/components/ai/ai-sidebar";
import { getUserAiMeta } from "@/lib/ai/user-key";

export default async function AiPage() {
  const { supabase } = await requireUser();
  const [meta, { data: conversations }] = await Promise.all([
    getUserAiMeta(supabase),
    supabase
      .from("ai_conversations")
      .select("id, title, updated_at")
      .order("updated_at", { ascending: false })
      .limit(40),
  ]);

  return (
    <div className="dash-enter space-y-6 sm:space-y-8">
      <PageHeader
        title="Asistente"
        subtitle="Pregunta en español sobre tus cuentas, TDC y movimientos. Trae tu propia clave."
      />
      {!meta.configured ? (
        <AiKeyGate />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
          <AiSidebar conversations={conversations ?? []} activeId={null} />
          <AiChat conversationId={null} initialMessages={[]} />
        </div>
      )}
    </div>
  );
}
