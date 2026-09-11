"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { ActionResult } from "@/app/actions/accounts";
import type { Json } from "@/lib/database.types";
import { parseBankFile } from "@/lib/import/parse";
import { requireProjectWriter } from "@/lib/projects";

const MAX_BYTES = 8 * 1024 * 1024;

export async function uploadImportFile(
  formData: FormData,
): Promise<ActionResult & { batchId?: string }> {
  const { supabase, user, project } = await requireProjectWriter();

  const file = formData.get("file");
  const accountIdRaw = formData.get("accountId");
  const accountId =
    typeof accountIdRaw === "string" && accountIdRaw.trim()
      ? accountIdRaw.trim()
      : null;

  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Elige un archivo CSV u OFX." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "El archivo supera 8 MB." };
  }

  if (accountId && !z.string().uuid().safeParse(accountId).success) {
    return { ok: false, error: "Cuenta inválida." };
  }

  if (accountId) {
    const { data: account } = await supabase
      .from("accounts")
      .select("id")
      .eq("id", accountId)
      .eq("project_id", project.id)
      .maybeSingle();
    if (!account) {
      return { ok: false, error: "Cuenta no encontrada en este proyecto." };
    }
  }

  const text = await file.text();
  let parsed;
  try {
    parsed = parseBankFile(file.name, text);
  } catch (err) {
    return {
      ok: false,
      error: err instanceof Error ? err.message : "No se pudo leer el archivo.",
    };
  }

  if (parsed.lines.length === 0) {
    return { ok: false, error: "No encontré movimientos en el archivo." };
  }

  const { data: batch, error: batchError } = await supabase
    .from("import_batches")
    .insert({
      project_id: project.id,
      user_id: user.id,
      source_filename: file.name.slice(0, 200),
      source_format: parsed.format,
      account_id: accountId,
      status: "review",
      row_count: parsed.lines.length,
      applied_count: 0,
    })
    .select("id")
    .single();

  if (batchError || !batch) {
    return {
      ok: false,
      error: batchError?.message ?? "No se creó el lote de importación.",
    };
  }

  const rows = parsed.lines.map((line) => ({
    batch_id: batch.id,
    project_id: project.id,
    status: "review" as const,
    occurred_on: line.occurredOn,
    amount_cents: line.amountCents,
    type: line.type,
    merchant: line.merchant,
    description: line.description,
    category: line.category,
    fingerprint: line.fingerprint,
    raw: line.raw as Json,
  }));

  // Insert in chunks to avoid payload limits
  const chunkSize = 200;
  for (let i = 0; i < rows.length; i += chunkSize) {
    const chunk = rows.slice(i, i + chunkSize);
    const { error: rowError } = await supabase.from("import_rows").insert(chunk);
    if (rowError) {
      return { ok: false, error: rowError.message };
    }
  }

  revalidatePath("/app/import");
  redirect(`/app/import/${batch.id}`);
}

export async function rejectImportRow(rowId: string): Promise<ActionResult> {
  const { supabase, project } = await requireProjectWriter();
  if (!z.string().uuid().safeParse(rowId).success) {
    return { ok: false, error: "Fila inválida." };
  }

  const { error } = await supabase
    .from("import_rows")
    .update({ status: "rejected" })
    .eq("id", rowId)
    .eq("project_id", project.id)
    .eq("status", "review");

  if (error) return { ok: false, error: error.message };
  revalidatePath("/app/import");
  return { ok: true };
}

export async function applyImportBatch(
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, project } = await requireProjectWriter();

  const parsed = z
    .object({
      batchId: z.string().uuid(),
      accountId: z.string().uuid(),
      rowIds: z.string().optional(),
    })
    .safeParse({
      batchId: formData.get("batchId"),
      accountId: formData.get("accountId"),
      rowIds: formData.get("rowIds") || undefined,
    });

  if (!parsed.success) {
    return { ok: false, error: "Datos de aplicación inválidos." };
  }

  const { data: batch } = await supabase
    .from("import_batches")
    .select("id")
    .eq("id", parsed.data.batchId)
    .eq("project_id", project.id)
    .maybeSingle();

  if (!batch) {
    return { ok: false, error: "Lote no encontrado." };
  }

  let rowIds: string[] | null = null;
  if (parsed.data.rowIds?.trim()) {
    const ids = parsed.data.rowIds
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    if (ids.some((id) => !z.string().uuid().safeParse(id).success)) {
      return { ok: false, error: "IDs de filas inválidos." };
    }
    rowIds = ids;
  }

  const { data: applied, error } = await supabase.rpc("apply_import_rows", {
    p_batch_id: parsed.data.batchId,
    p_account_id: parsed.data.accountId,
    p_row_ids: rowIds,
  });

  if (error) return { ok: false, error: error.message };

  revalidatePath("/app");
  revalidatePath("/app/import");
  revalidatePath(`/app/import/${parsed.data.batchId}`);
  revalidatePath("/app/transactions");
  revalidatePath(`/app/accounts/${parsed.data.accountId}`);
  return {
    ok: true,
    ...(typeof applied === "number" ? {} : {}),
  };
}
