import type { McpServer } from "@modelcontextprotocol/server";
import { createServiceClient } from "@/lib/supabase/admin";
import { buildCashishTools } from "@/lib/finance-tools";

function ok(data: unknown) {
  const text = typeof data === "string" ? data : JSON.stringify(data, null, 2);
  return {
    content: [{ type: "text" as const, text }],
    structuredContent:
      typeof data === "object" && data !== null ? data : { result: data },
  };
}

function fail(message: string) {
  return {
    content: [{ type: "text" as const, text: message }],
    isError: true as const,
  };
}

export function registerCashishTools(server: McpServer, userId: string) {
  const ctx = { userId, db: () => createServiceClient() };
  for (const tool of buildCashishTools()) {
    server.registerTool(
      tool.name,
      {
        title: tool.title,
        description: tool.description,
        inputSchema: tool.inputSchema,
        annotations: tool.annotations,
      },
      async (args) => {
        try {
          const data = await tool.execute(ctx, args as Record<string, unknown>);
          return ok(data);
        } catch (e) {
          return fail(e instanceof Error ? e.message : "Error");
        }
      },
    );
  }
}
