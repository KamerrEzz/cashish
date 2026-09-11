import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { runCashishChat, type ChatSseEvent } from "@/lib/ai/chat";
import {
  getUserAiCred,
  jsonMissingKey,
  MissingAiKeyError,
} from "@/lib/ai/user-key";
import { compatibleClient } from "@/lib/ai/provider";
import {
  PROJECT_COOKIE,
  resolveActiveProject,
} from "@/lib/projects";

export const runtime = "nodejs";
export const maxDuration = 60;

function sseEncode(event: ChatSseEvent) {
  return `data: ${JSON.stringify(event)}\n\n`;
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return Response.json({ error: "No autenticado" }, { status: 401 });
  }

  const jar = await cookies();
  const preferred = jar.get(PROJECT_COOKIE)?.value ?? null;
  let projectId: string;
  try {
    const resolved = await resolveActiveProject(supabase, user.id, preferred);
    projectId = resolved.project.id;
  } catch (err) {
    return Response.json(
      {
        error:
          err instanceof Error ? err.message : "No se pudo resolver el proyecto",
      },
      { status: 400 },
    );
  }

  const body = (await request.json()) as {
    conversationId?: string | null;
    message?: string;
  };
  const message = body.message?.trim() ?? "";
  if (!message) {
    return Response.json({ error: "Falta el mensaje" }, { status: 400 });
  }

  let cred;
  try {
    cred = await getUserAiCred(supabase);
  } catch (err) {
    if (err instanceof MissingAiKeyError) return jsonMissingKey(err);
    return Response.json(
      { error: err instanceof Error ? err.message : "No se pudo usar la clave" },
      { status: 400 },
    );
  }

  let conversationId = body.conversationId ?? null;
  if (conversationId) {
    const { data: owned } = await supabase
      .from("ai_conversations")
      .select("id")
      .eq("id", conversationId)
      .eq("user_id", user.id)
      .eq("project_id", projectId)
      .maybeSingle();
    if (!owned) {
      return Response.json({ error: "Conversación no encontrada" }, { status: 404 });
    }
  } else {
    const title = message.slice(0, 80);
    const { data: convo, error } = await supabase
      .from("ai_conversations")
      .insert({ user_id: user.id, project_id: projectId, title })
      .select("id")
      .single();
    if (error) return Response.json({ error: error.message }, { status: 500 });
    conversationId = convo.id;
  }

  await supabase.from("ai_messages").insert({
    conversation_id: conversationId,
    role: "user",
    content: message,
  });

  const { data: prior } = await supabase
    .from("ai_messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .in("role", ["user", "assistant"])
    .order("created_at", { ascending: true })
    .limit(40);

  const history: ChatCompletionMessageParam[] = (prior ?? []).map((m) => ({
    role: m.role as "user" | "assistant",
    content: m.content,
  }));

  const client = compatibleClient(cred.apiKey, cred.baseUrl);
  const encoder = new TextEncoder();
  const convoId = conversationId;
  const activeProjectId = projectId;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: ChatSseEvent) => {
        controller.enqueue(encoder.encode(sseEncode(event)));
      };
      try {
        send({ conversationId: convoId });
        const result = await runCashishChat({
          client,
          cred,
          userId: user.id,
          projectId: activeProjectId,
          history,
          onEvent: send,
        });

        await supabase.from("ai_messages").insert({
          conversation_id: convoId,
          role: "assistant",
          content: result.assistantText,
        });
        await supabase
          .from("ai_conversations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", convoId);
        await supabase.from("ai_usage_events").insert({
          user_id: user.id,
          project_id: activeProjectId,
          kind: "chat",
          model: cred.chatModel,
          prompt_tokens: result.promptTokens,
          completion_tokens: result.completionTokens,
          estimated_usd: result.estimatedUsd,
        });

        send({ done: true, conversationId: convoId });
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Error al generar respuesta";
        send({ error: msg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
