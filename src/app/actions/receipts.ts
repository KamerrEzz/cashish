"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/app/actions/accounts";
import { compatibleClient } from "@/lib/ai/provider";
import { getUserAiCred, MissingAiKeyError } from "@/lib/ai/user-key";
import { asCurrency, parseMoneyInput } from "@/lib/money";
import { merchantKey } from "@/lib/merchant";
import { requireProjectWriter } from "@/lib/projects";
import type { Json } from "@/lib/database.types";

const parsedReceiptSchema = z.object({
  amount: z.string().min(1),
  occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  merchant: z.string().nullable().optional(),
  merchant_key: z.string().nullable().optional(),
  category: z.string().nullable().optional(),
  description: z.string().nullable().optional(),
  type: z.enum(["expense", "income"]),
  confidence: z.number().min(0).max(1).optional(),
});

export type ParsedReceiptDraft = z.infer<typeof parsedReceiptSchema>;

export type UploadReceiptResult =
  | { ok: true; receiptId: string; parsed: ParsedReceiptDraft }
  | { ok: false; error: string };

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/pdf",
]);

const MAX_BYTES = 10 * 1024 * 1024;

function todayIsoMexico() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function extForMime(mime: string) {
  switch (mime) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    case "application/pdf":
      return "pdf";
    default:
      return "bin";
  }
}

function crudePdfText(buffer: Buffer): string {
  const latin = buffer.toString("latin1");
  const chunks: string[] = [];
  const paren = /\((?:\\.|[^\\)]){2,}\)(?:\s*Tj|\s*TJ)/g;
  let match: RegExpExecArray | null;
  while ((match = paren.exec(latin)) !== null) {
    const inner = match[0]
      .replace(/^\(/, "")
      .replace(/\)(?:\s*Tj|\s*TJ)$/, "")
      .replace(/\\([nrt\\()])/g, (_, c: string) => {
        if (c === "n") return "\n";
        if (c === "r") return "\r";
        if (c === "t") return "\t";
        return c;
      });
    if (inner.trim()) chunks.push(inner);
  }
  const printable = latin
    .replace(/[^\x20-\x7E\n\r\tÁÉÍÓÚÜÑáéíóúüñ¿¡$%.,:/0-9A-Za-z -]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  const joined = chunks.join(" ").trim();
  return (joined.length > 40 ? joined : printable).slice(0, 8000);
}

function coerceParsed(raw: unknown): ParsedReceiptDraft | null {
  if (!raw || typeof raw !== "object") return null;
  const obj = raw as Record<string, unknown>;
  let amount = obj.amount;
  if (typeof amount === "number") {
    amount = amount.toFixed(2);
  }
  const occurredOn =
    typeof obj.occurredOn === "string"
      ? obj.occurredOn
      : typeof obj.occurred_on === "string"
        ? obj.occurred_on
        : todayIsoMexico();
  const merchant =
    typeof obj.merchant === "string"
      ? obj.merchant
      : obj.merchant == null
        ? null
        : String(obj.merchant);
  const confidenceRaw = obj.confidence;
  const confidence =
    typeof confidenceRaw === "number" && Number.isFinite(confidenceRaw)
      ? Math.min(1, Math.max(0, confidenceRaw))
      : 0.7;
  const result = parsedReceiptSchema.safeParse({
    amount: String(amount ?? ""),
    occurredOn: occurredOn.slice(0, 10),
    merchant,
    merchant_key: merchantKey(merchant),
    category:
      typeof obj.category === "string"
        ? obj.category
        : obj.category == null
          ? null
          : String(obj.category),
    description:
      typeof obj.description === "string"
        ? obj.description
        : obj.description == null
          ? null
          : String(obj.description),
    type: obj.type === "income" ? "income" : "expense",
    confidence,
  });
  return result.success ? result.data : null;
}

function withMerchantMeta(parsed: ParsedReceiptDraft): ParsedReceiptDraft {
  return {
    ...parsed,
    merchant_key: parsed.merchant_key ?? merchantKey(parsed.merchant),
    confidence: parsed.confidence ?? 0.7,
  };
}

async function extractWithAi(opts: {
  mime: string;
  bytes: Buffer;
  chatModel: string;
  client: ReturnType<typeof compatibleClient>;
}): Promise<ParsedReceiptDraft> {
  const system = `Eres un extractor de tickets/recibos mexicanos. Responde SOLO JSON válido con:
{"amount":"123.45","occurredOn":"YYYY-MM-DD","merchant":"string|null","category":"string|null","description":"string|null","type":"expense"|"income"}
Monto en MXN decimal con punto. Si no hay fecha, usa ${todayIsoMexico()}. type casi siempre expense.`;

  const userText =
    "Extrae los campos del ticket. Si algo no está claro, infiere con cuidado o usa null.";

  let content: string | null = null;

  if (opts.mime.startsWith("image/")) {
    const b64 = opts.bytes.toString("base64");
    const dataUrl = `data:${opts.mime};base64,${b64}`;
    const completion = await opts.client.chat.completions.create({
      model: opts.chatModel,
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: system },
        {
          role: "user",
          content: [
            { type: "text", text: userText },
            { type: "image_url", image_url: { url: dataUrl } },
          ],
        },
      ],
    });
    content = completion.choices[0]?.message?.content ?? null;
  } else {
    const pdfText = crudePdfText(opts.bytes);
    if (pdfText.length < 20) {
      // Fallback: ask model with note; some compatible endpoints accept pdf data URLs as image_url
      const b64 = opts.bytes.toString("base64");
      try {
        const completion = await opts.client.chat.completions.create({
          model: opts.chatModel,
          temperature: 0,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: system },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `${userText} El archivo es PDF; si no puedes leerlo, inventa campos vacíos razonables con amount "0.00".`,
                },
                {
                  type: "image_url",
                  image_url: { url: `data:application/pdf;base64,${b64}` },
                },
              ],
            },
          ],
        });
        content = completion.choices[0]?.message?.content ?? null;
      } catch {
        throw new Error(
          "No pude leer el PDF. Sube una foto (JPG/PNG) o revisa el archivo.",
        );
      }
    } else {
      const completion = await opts.client.chat.completions.create({
        model: opts.chatModel,
        temperature: 0,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: system },
          {
            role: "user",
            content: `${userText}\n\nTexto extraído del PDF:\n${pdfText}`,
          },
        ],
      });
      content = completion.choices[0]?.message?.content ?? null;
    }
  }

  if (!content) {
    throw new Error("El modelo no devolvió datos del ticket.");
  }

  let json: unknown;
  try {
    json = JSON.parse(content);
  } catch {
    throw new Error("Respuesta del modelo no es JSON válido.");
  }

  const parsed = coerceParsed(json);
  if (!parsed) {
    throw new Error("No pude interpretar el ticket. Revisa o captura a mano.");
  }
  return parsed;
}

export async function uploadReceipt(
  formData: FormData,
): Promise<UploadReceiptResult> {
  const { supabase, user, project } = await requireProjectWriter();
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "Elige un archivo de ticket." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "El archivo supera 10 MB." };
  }
  const mime = file.type || "application/octet-stream";
  if (!ALLOWED_MIME.has(mime)) {
    return {
      ok: false,
      error: "Formato no soportado. Usa JPG, PNG, WebP o PDF.",
    };
  }

  let cred;
  try {
    cred = await getUserAiCred(supabase);
  } catch (err) {
    if (err instanceof MissingAiKeyError) {
      return {
        ok: false,
        error:
          "Para leer tickets configura tu clave de modelo en Agentes (BYOK).",
      };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error de clave de IA.",
    };
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const ext = extForMime(mime);
  const storagePath = `${project.id}/${user.id}/${randomUUID()}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from("receipts")
    .upload(storagePath, bytes, { contentType: mime, upsert: false });

  if (uploadError) {
    return { ok: false, error: uploadError.message };
  }

  const { data: receipt, error: insertError } = await supabase
    .from("receipts")
    .insert({
      project_id: project.id,
      uploaded_by: user.id,
      storage_path: storagePath,
      mime,
      status: "uploaded",
    })
    .select("id")
    .single();

  if (insertError || !receipt) {
    return {
      ok: false,
      error: insertError?.message ?? "No se guardó el ticket.",
    };
  }

  await supabase
    .from("receipts")
    .update({
      status: "parsing",
      updated_at: new Date().toISOString(),
    })
    .eq("id", receipt.id)
    .eq("project_id", project.id);

  try {
    const client = compatibleClient(cred.apiKey, cred.baseUrl);
    const parsed = withMerchantMeta(
      await extractWithAi({
        mime,
        bytes,
        chatModel: cred.chatModel,
        client,
      }),
    );

    const { error: readyError } = await supabase
      .from("receipts")
      .update({
        status: "ready",
        parsed: parsed as Json,
        error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", receipt.id)
      .eq("project_id", project.id);

    if (readyError) {
      return { ok: false, error: readyError.message };
    }

    revalidatePath("/app/transactions");
    revalidatePath("/app/receipts");
    return { ok: true, receiptId: receipt.id, parsed };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Falló el análisis del ticket.";
    await supabase
      .from("receipts")
      .update({
        status: "failed",
        error: message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", receipt.id)
      .eq("project_id", project.id);
    revalidatePath("/app/receipts");
    return { ok: false, error: message };
  }
}

export async function retryReceiptParse(
  receiptId: string,
): Promise<UploadReceiptResult> {
  const { supabase, project } = await requireProjectWriter();
  if (!z.string().uuid().safeParse(receiptId).success) {
    return { ok: false, error: "Ticket inválido." };
  }

  const { data: receipt, error: receiptError } = await supabase
    .from("receipts")
    .select("id, storage_path, mime, status, transaction_id")
    .eq("id", receiptId)
    .eq("project_id", project.id)
    .maybeSingle();

  if (receiptError || !receipt) {
    return { ok: false, error: "Ticket no encontrado." };
  }
  if (receipt.status === "applied" || receipt.transaction_id) {
    return { ok: false, error: "Este ticket ya se aplicó." };
  }

  let cred;
  try {
    cred = await getUserAiCred(supabase);
  } catch (err) {
    if (err instanceof MissingAiKeyError) {
      return {
        ok: false,
        error:
          "Para leer tickets configura tu clave de modelo en Agentes (BYOK).",
      };
    }
    return {
      ok: false,
      error: err instanceof Error ? err.message : "Error de clave de IA.",
    };
  }

  const { data: blob, error: downloadError } = await supabase.storage
    .from("receipts")
    .download(receipt.storage_path);

  if (downloadError || !blob) {
    return {
      ok: false,
      error: downloadError?.message ?? "No se pudo descargar el archivo.",
    };
  }

  const bytes = Buffer.from(await blob.arrayBuffer());

  await supabase
    .from("receipts")
    .update({
      status: "parsing",
      error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", receipt.id)
    .eq("project_id", project.id);

  try {
    const client = compatibleClient(cred.apiKey, cred.baseUrl);
    const parsed = withMerchantMeta(
      await extractWithAi({
        mime: receipt.mime,
        bytes,
        chatModel: cred.chatModel,
        client,
      }),
    );

    const { error: readyError } = await supabase
      .from("receipts")
      .update({
        status: "ready",
        parsed: parsed as Json,
        error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", receipt.id)
      .eq("project_id", project.id);

    if (readyError) {
      return { ok: false, error: readyError.message };
    }

    revalidatePath("/app/receipts");
    revalidatePath("/app/transactions");
    return { ok: true, receiptId: receipt.id, parsed };
  } catch (err) {
    const message =
      err instanceof Error ? err.message : "Falló el análisis del ticket.";
    await supabase
      .from("receipts")
      .update({
        status: "failed",
        error: message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", receipt.id)
      .eq("project_id", project.id);
    revalidatePath("/app/receipts");
    return { ok: false, error: message };
  }
}

export async function discardReceipt(receiptId: string): Promise<ActionResult> {
  const { supabase, project } = await requireProjectWriter();
  if (!z.string().uuid().safeParse(receiptId).success) {
    return { ok: false, error: "Ticket inválido." };
  }

  const { data: receipt } = await supabase
    .from("receipts")
    .select("id, storage_path, status, transaction_id")
    .eq("id", receiptId)
    .eq("project_id", project.id)
    .maybeSingle();

  if (!receipt) {
    return { ok: false, error: "Ticket no encontrado." };
  }
  if (receipt.status === "applied" || receipt.transaction_id) {
    return { ok: false, error: "No se puede descartar un ticket aplicado." };
  }

  await supabase.storage.from("receipts").remove([receipt.storage_path]);

  const { error } = await supabase
    .from("receipts")
    .delete()
    .eq("id", receipt.id)
    .eq("project_id", project.id);

  if (error) return { ok: false, error: error.message };
  revalidatePath("/app/receipts");
  revalidatePath("/app/transactions");
  return { ok: true };
}

export async function applyReceipt(
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, user, project } = await requireProjectWriter();

  const parsed = z
    .object({
      receiptId: z.string().uuid(),
      accountId: z.string().uuid(),
      type: z.enum(["expense", "income"]),
      amount: z.string().min(1),
      merchant: z.string().optional(),
      description: z.string().optional(),
      category: z.string().optional(),
      occurredOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    })
    .safeParse({
      receiptId: formData.get("receiptId"),
      accountId: formData.get("accountId"),
      type: formData.get("type"),
      amount: formData.get("amount"),
      merchant: formData.get("merchant") || undefined,
      description: formData.get("description") || undefined,
      category: formData.get("category") || undefined,
      occurredOn: formData.get("occurredOn"),
    });

  if (!parsed.success) {
    return { ok: false, error: "Revisa los datos del ticket antes de aplicar." };
  }

  const { data: receipt, error: receiptError } = await supabase
    .from("receipts")
    .select("id, status, transaction_id")
    .eq("id", parsed.data.receiptId)
    .eq("project_id", project.id)
    .single();

  if (receiptError || !receipt) {
    return { ok: false, error: "Ticket no encontrado." };
  }
  if (receipt.status === "applied" || receipt.transaction_id) {
    return { ok: false, error: "Este ticket ya se aplicó." };
  }
  if (receipt.status !== "ready") {
    return { ok: false, error: "El ticket aún no está listo para aplicar." };
  }

  const { data: account, error: accountError } = await supabase
    .from("accounts")
    .select("id, type, balance_cents, currency")
    .eq("id", parsed.data.accountId)
    .eq("project_id", project.id)
    .single();

  if (accountError || !account) {
    return { ok: false, error: "Cuenta no encontrada." };
  }

  let amountCents: number;
  try {
    amountCents = parseMoneyInput(
      parsed.data.amount,
      asCurrency(account.currency),
    ).amount;
  } catch {
    return { ok: false, error: "Monto inválido." };
  }
  if (amountCents <= 0) {
    return { ok: false, error: "El monto debe ser mayor a 0." };
  }

  let statementPeriodId: string | null = null;
  if (account.type === "credit_card") {
    const { data: period } = await supabase
      .from("statement_periods")
      .select("id")
      .eq("account_id", account.id)
      .eq("project_id", project.id)
      .eq("status", "open")
      .maybeSingle();
    statementPeriodId = period?.id ?? null;
  }

  let nextBalance = account.balance_cents;
  if (account.type === "credit_card") {
    nextBalance =
      parsed.data.type === "expense"
        ? account.balance_cents + amountCents
        : account.balance_cents - amountCents;
  } else {
    nextBalance =
      parsed.data.type === "income"
        ? account.balance_cents + amountCents
        : account.balance_cents - amountCents;
  }

  const { data: tx, error: txError } = await supabase
    .from("transactions")
    .insert({
      user_id: user.id,
      project_id: project.id,
      account_id: account.id,
      type: parsed.data.type,
      amount_cents: amountCents,
      currency: asCurrency(account.currency),
      merchant: parsed.data.merchant ?? null,
      merchant_key: merchantKey(parsed.data.merchant),
      description: parsed.data.description ?? null,
      category: parsed.data.category ?? null,
      occurred_on: parsed.data.occurredOn,
      statement_period_id: statementPeriodId,
    })
    .select("id")
    .single();

  if (txError || !tx) {
    return { ok: false, error: txError?.message ?? "No se creó el movimiento." };
  }

  const { error: balError } = await supabase
    .from("accounts")
    .update({
      balance_cents: nextBalance,
      updated_at: new Date().toISOString(),
    })
    .eq("id", account.id)
    .eq("project_id", project.id);

  if (balError) {
    return { ok: false, error: balError.message };
  }

  const { error: applyError } = await supabase
    .from("receipts")
    .update({
      status: "applied",
      transaction_id: tx.id,
      parsed: {
        amount: parsed.data.amount,
        occurredOn: parsed.data.occurredOn,
        merchant: parsed.data.merchant ?? null,
        merchant_key: merchantKey(parsed.data.merchant),
        category: parsed.data.category ?? null,
        description: parsed.data.description ?? null,
        type: parsed.data.type,
        confidence: 0.7,
      } as Json,
      error: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", receipt.id)
    .eq("project_id", project.id);

  if (applyError) {
    return { ok: false, error: applyError.message };
  }

  revalidatePath("/app");
  revalidatePath("/app/transactions");
  revalidatePath("/app/receipts");
  revalidatePath(`/app/accounts/${account.id}`);
  return { ok: true };
}
