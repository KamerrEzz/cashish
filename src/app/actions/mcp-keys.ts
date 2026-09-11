"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { generateApiKey } from "@/lib/mcp/auth";
import type { ActionResult } from "@/app/actions/accounts";

export type CreatedKeyResult =
  | { ok: true; rawKey: string; prefix: string; id: string }
  | { ok: false; error: string };

export async function createMcpApiKey(
  formData: FormData,
): Promise<CreatedKeyResult> {
  const { supabase, user } = await requireUser();
  const parsed = z
    .object({
      name: z.string().min(1).max(60),
    })
    .safeParse({ name: formData.get("name") });

  if (!parsed.success) {
    return { ok: false, error: "Nombre inválido." };
  }

  const generated = generateApiKey();
  const { data, error } = await supabase
    .from("mcp_api_keys")
    .insert({
      user_id: user.id,
      name: parsed.data.name,
      key_prefix: generated.prefix,
      key_hash: generated.hash,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { ok: false, error: error?.message ?? "No se pudo crear la clave." };
  }

  revalidatePath("/app/agents");
  return {
    ok: true,
    rawKey: generated.raw,
    prefix: generated.prefix,
    id: data.id,
  };
}

export async function revokeMcpApiKey(id: string): Promise<ActionResult> {
  const { supabase } = await requireUser();
  const { error } = await supabase
    .from("mcp_api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .is("revoked_at", null);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/app/agents");
  return { ok: true };
}
