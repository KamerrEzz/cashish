import type { SupabaseClient } from "@supabase/supabase-js";
import { AI_PRESETS, isAiProviderId, type AiProviderId } from "@/lib/ai/catalog";
import { compatibleClient } from "@/lib/ai/provider";
import { decryptSecret } from "@/lib/crypto/secret";
import type { Database } from "@/lib/database.types";

export type AiCred = {
  apiKey: string;
  provider: AiProviderId;
  baseUrl: string;
  chatModel: string;
};

export type AiCredMeta = {
  configured: boolean;
  last4: string | null;
  updatedAt: string | null;
  provider: AiProviderId;
  baseUrl: string;
  chatModel: string;
};

export class MissingAiKeyError extends Error {
  readonly code = "missing_ai_key" as const;
  constructor(
    message = "Añade tu clave de modelo en Agentes para usar el asistente.",
  ) {
    super(message);
    this.name = "MissingAiKeyError";
  }
}

type MetaRow = {
  last4?: string;
  updated_at?: string;
  provider?: string;
  base_url?: string | null;
  chat_model?: string | null;
};

function defaultsFrom(
  provider: AiProviderId,
): Omit<AiCredMeta, "configured" | "last4" | "updatedAt"> {
  const preset = AI_PRESETS[provider];
  return {
    provider,
    baseUrl: preset.baseUrl,
    chatModel: preset.chatModel,
  };
}

export async function getUserAiMeta(
  supabase: SupabaseClient<Database>,
): Promise<AiCredMeta> {
  const fallback = {
    configured: false as const,
    last4: null,
    updatedAt: null,
    ...defaultsFrom("openai"),
  };
  const { data, error } = await supabase.rpc("own_ai_credential_meta");
  if (error) throw new Error(error.message);
  const row = (Array.isArray(data) ? data[0] : data) as MetaRow | null;
  if (!row?.last4) return fallback;
  const raw = row.provider ?? "openai";
  const provider = isAiProviderId(raw) ? raw : "openai";
  const preset = AI_PRESETS[provider];
  return {
    configured: true,
    last4: row.last4,
    updatedAt: row.updated_at ?? null,
    provider,
    baseUrl: row.base_url || preset.baseUrl,
    chatModel: row.chat_model || preset.chatModel,
  };
}

export async function getUserAiCred(
  supabase: SupabaseClient<Database>,
): Promise<AiCred> {
  const [{ data: cipher, error: cipherError }, meta] = await Promise.all([
    supabase.rpc("own_ai_credential_cipher"),
    getUserAiMeta(supabase),
  ]);
  if (cipherError) throw new Error(cipherError.message);
  if (!cipher || typeof cipher !== "string" || !meta.configured) {
    throw new MissingAiKeyError();
  }
  return {
    apiKey: decryptSecret(cipher),
    provider: meta.provider,
    baseUrl: meta.baseUrl,
    chatModel: meta.chatModel,
  };
}

export async function openaiForUser(supabase: SupabaseClient<Database>) {
  const cred = await getUserAiCred(supabase);
  return { client: compatibleClient(cred.apiKey, cred.baseUrl), cred };
}

export function jsonMissingKey(err?: unknown) {
  const message =
    err instanceof MissingAiKeyError
      ? err.message
      : new MissingAiKeyError().message;
  return Response.json(
    { error: message, code: "missing_ai_key" },
    { status: 409 },
  );
}
