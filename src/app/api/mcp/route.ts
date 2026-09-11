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
        registerCashishTools(server, auth.userId);
      },
      {
        serverInfo: {
          name: "cashish-mcp-server",
          version: "1.0.0",
        },
        instructions:
          "Cashish personal finance for Mexico/MXN. Prefer cashish_dashboard first, then mutate with create_transaction / pay_credit_card / create_subscription. Amounts are MXN decimal strings.",
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
