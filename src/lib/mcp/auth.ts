import { createHash, randomBytes } from "node:crypto";
import { createServiceClient } from "@/lib/supabase/admin";

const KEY_PREFIX = "csh_";

export function hashApiKey(rawKey: string): string {
  return createHash("sha256").update(rawKey).digest("hex");
}

export function generateApiKey(): { raw: string; prefix: string; hash: string } {
  const secret = randomBytes(24).toString("base64url");
  const raw = `${KEY_PREFIX}${secret}`;
  return {
    raw,
    prefix: raw.slice(0, 12),
    hash: hashApiKey(raw),
  };
}

export type McpAuthContext = {
  userId: string;
  keyId: string;
};

export async function resolveMcpBearer(
  authorizationHeader: string | null,
): Promise<McpAuthContext | null> {
  if (!authorizationHeader?.startsWith("Bearer ")) {
    return null;
  }
  const token = authorizationHeader.slice("Bearer ".length).trim();
  if (!token.startsWith(KEY_PREFIX) || token.length < 20) {
    return null;
  }

  const hash = hashApiKey(token);
  const admin = createServiceClient();
  const { data, error } = await admin.rpc("mcp_resolve_api_key", {
    p_key_hash: hash,
  });

  if (error || !data || data.length === 0) {
    return null;
  }

  const row = Array.isArray(data) ? data[0] : data;
  if (!row?.user_id || !row?.key_id) {
    return null;
  }

  return { userId: row.user_id, keyId: row.key_id };
}

export function mcpUnauthorizedResponse(message = "Missing or invalid API key") {
  return new Response(
    JSON.stringify({
      error: message,
      hint: "Create a key in Cashish → Agentes and send Authorization: Bearer csh_…",
    }),
    {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        "WWW-Authenticate": 'Bearer realm="cashish-mcp", error="invalid_token"',
      },
    },
  );
}
