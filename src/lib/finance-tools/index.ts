import { z } from "zod";
import type { ChatCompletionTool } from "openai/resources/chat/completions";
import { createServiceClient } from "@/lib/supabase/admin";
import { buildCashishTools } from "./defs";
import type { CashishToolDef, ToolCtx } from "./types";

export type { Admin, CashishToolDef, ToolCtx } from "./types";
export { buildCashishTools } from "./defs";

export function executeCashishTool(
  name: string,
  args: unknown,
  userId: string,
): Promise<unknown> {
  const tool = buildCashishTools().find((t) => t.name === name);
  if (!tool) {
    throw new Error(`Herramienta desconocida: ${name}`);
  }
  const ctx: ToolCtx = {
    userId,
    db: () => createServiceClient(),
  };
  return tool.execute(ctx, (args ?? {}) as Record<string, unknown>);
}

function schemaToParameters(schema: CashishToolDef["inputSchema"]) {
  const json = z.toJSONSchema(schema) as Record<string, unknown>;
  const { $schema: _schema, ...rest } = json;
  return rest;
}

export function cashishToolsForOpenAI(): ChatCompletionTool[] {
  return buildCashishTools().map((tool) => ({
    type: "function" as const,
    function: {
      name: tool.name,
      description: tool.description,
      parameters: schemaToParameters(tool.inputSchema),
    },
  }));
}
