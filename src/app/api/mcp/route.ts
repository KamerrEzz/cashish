import { createMcpHandler } from "mcp-handler";
import {
  mcpUnauthorizedResponse,
  resolveMcpBearer,
} from "@/lib/mcp/auth";
import { registerCashishTools } from "@/lib/mcp/tools";

export const runtime = "nodejs";
export const maxDuration = 60;

async function handle(req: Request) {
  try {
    const auth = await resolveMcpBearer(req.headers.get("authorization"));
    if (!auth) {
      return mcpUnauthorizedResponse();
    }

    const mcp = createMcpHandler(
      (server) => {
        registerCashishTools(server, auth.userId, auth.projectId);
      },
      {
        serverInfo: {
          name: "cashish-mcp-server",
          version: "1.0.0",
        },
        instructions:
          "Cashish personal finance (Mexico/MXN). Start with cashish_list_tools_help or cashish_dashboard. Amounts are MXN decimal strings. Credit card balance_cents is debt owed; available = limit - owed. Prefer cashish_pay_credit_card for card payments.",
      },
    );

    return mcp(req);
  } catch (error) {
    const message = error instanceof Error ? error.message : "MCP error";
    if (message.includes("SUPABASE_SERVICE_ROLE_KEY")) {
      return new Response(
        JSON.stringify({
          error:
            "Server missing SUPABASE_SERVICE_ROLE_KEY. Add it in Vercel env to enable MCP.",
        }),
        { status: 503, headers: { "Content-Type": "application/json" } },
      );
    }
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export { handle as GET, handle as POST, handle as DELETE };
