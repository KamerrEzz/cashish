import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { PageHeader } from "@/components/ui";
import { AiChat } from "@/components/ai/ai-chat";
import { AiKeyGate } from "@/components/ai/ai-key-gate";
import { AiSidebar } from "@/components/ai/ai-sidebar";
import { getUserAiMeta } from "@/lib/ai/user-key";

export default async function AiConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const { supabase, user } = await requireUser();
  const meta = await getUserAiMeta(supabase);

  const [{ data: conversations }, { data: convo }] = await Promise.all([
    supabase
      .from("ai_conversations")
      .select("id, title, updated_at")
      .order("updated_at", { ascending: false })
      .limit(40),
    supabase
      .from("ai_conversations")
      .select("id, title")
      .eq("id", conversationId)
      .eq("user_id", user.id)
      .maybeSingle(),
  ]);

  if (!convo) notFound();

  const { data: messages } = await supabase
    .from("ai_messages")
    .select("id, role, content")
    .eq("conversation_id", conversationId)
    .in("role", ["user", "assistant"])
    .order("created_at", { ascending: true });

  return (
    <div className="dash-enter space-y-6 sm:space-y-8">
      <PageHeader
        title={convo.title || "Conversación"}
        subtitle="Asistente Cashish · grounded en tus datos vía tools"
      />
      {!meta.configured ? (
        <AiKeyGate />
      ) : (
        <div className="grid gap-4 lg:grid-cols-[220px_1fr]">
          <AiSidebar
            conversations={conversations ?? []}
            activeId={conversationId}
          />
          <AiChat
            conversationId={conversationId}
            initialMessages={messages ?? []}
          />
        </div>
      )}
    </div>
  );
}
