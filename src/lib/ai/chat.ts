import type OpenAI from "openai";
import type {
  ChatCompletionMessageParam,
  ChatCompletionToolMessageParam,
} from "openai/resources/chat/completions";
import { CASHISH_SYSTEM_PROMPT } from "@/lib/ai/prompts";
import { estimateChatUsd } from "@/lib/ai/usage";
import {
  cashishToolsForOpenAI,
  executeCashishTool,
} from "@/lib/finance-tools";
import type { AiCred } from "@/lib/ai/user-key";

export type ChatSseEvent =
  | { conversationId: string }
  | { token: string }
  | { tool: { name: string; status: "start" | "done" } }
  | { toolResult: { name: string; result: unknown } }
  | { done: true; conversationId: string }
  | { error: string };

const MAX_TOOL_ROUNDS = 8;

export async function runCashishChat(opts: {
  client: OpenAI;
  cred: AiCred;
  userId: string;
  projectId: string;
  history: ChatCompletionMessageParam[];
  onEvent: (event: ChatSseEvent) => void;
}): Promise<{
  assistantText: string;
  promptTokens: number;
  completionTokens: number;
  estimatedUsd: number;
}> {
  const tools = cashishToolsForOpenAI();
  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: CASHISH_SYSTEM_PROMPT },
    ...opts.history,
  ];

  let promptTokens = 0;
  let completionTokens = 0;
  let assistantText = "";

  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    const stream = await opts.client.chat.completions.create({
      model: opts.cred.chatModel,
      stream: true,
      stream_options: { include_usage: true },
      temperature: 0.2,
      tools,
      tool_choice: "auto",
      messages,
    });

    const toolCallBuffers = new Map<
      number,
      { id: string; name: string; arguments: string }
    >();
    let contentBuf = "";
    let finishReason: string | null = null;

    for await (const chunk of stream) {
      if (chunk.usage) {
        promptTokens += chunk.usage.prompt_tokens ?? 0;
        completionTokens += chunk.usage.completion_tokens ?? 0;
      }
      const choice = chunk.choices[0];
      if (!choice) continue;
      if (choice.finish_reason) finishReason = choice.finish_reason;

      const delta = choice.delta;
      if (delta?.content) {
        contentBuf += delta.content;
        opts.onEvent({ token: delta.content });
      }
      if (delta?.tool_calls) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index ?? 0;
          const existing = toolCallBuffers.get(idx) ?? {
            id: "",
            name: "",
            arguments: "",
          };
          if (tc.id) existing.id = tc.id;
          if (tc.function?.name) existing.name = tc.function.name;
          if (tc.function?.arguments) {
            existing.arguments += tc.function.arguments;
          }
          toolCallBuffers.set(idx, existing);
        }
      }
    }

    if (finishReason === "tool_calls" || toolCallBuffers.size > 0) {
      const toolCalls = [...toolCallBuffers.entries()]
        .sort(([a], [b]) => a - b)
        .map(([, v]) => v)
        .filter((v) => v.id && v.name);

      messages.push({
        role: "assistant",
        content: contentBuf || null,
        tool_calls: toolCalls.map((tc) => ({
          id: tc.id,
          type: "function" as const,
          function: { name: tc.name, arguments: tc.arguments },
        })),
      });

      for (const tc of toolCalls) {
        opts.onEvent({ tool: { name: tc.name, status: "start" } });
        let resultText: string;
        try {
          let parsed: unknown = {};
          try {
            parsed = tc.arguments ? JSON.parse(tc.arguments) : {};
          } catch {
            parsed = {};
          }
          const result = await executeCashishTool(
            tc.name,
            parsed,
            opts.userId,
            opts.projectId,
          );
          resultText =
            typeof result === "string" ? result : JSON.stringify(result);
          opts.onEvent({ toolResult: { name: tc.name, result } });
        } catch (err) {
          resultText = JSON.stringify({
            error: err instanceof Error ? err.message : "Error de tool",
          });
        }
        opts.onEvent({ tool: { name: tc.name, status: "done" } });
        const toolMsg: ChatCompletionToolMessageParam = {
          role: "tool",
          tool_call_id: tc.id,
          content: resultText.slice(0, 120_000),
        };
        messages.push(toolMsg);
      }
      continue;
    }

    assistantText = contentBuf;
    break;
  }

  if (!assistantText) {
    assistantText =
      "No pude completar la respuesta. Intenta de nuevo o revisa tu clave/modelo.";
    opts.onEvent({ token: assistantText });
  }

  return {
    assistantText,
    promptTokens,
    completionTokens,
    estimatedUsd: estimateChatUsd(
      opts.cred.chatModel,
      promptTokens,
      completionTokens,
    ),
  };
}
