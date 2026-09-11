"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ActionResult } from "@/app/actions/accounts";
import { requireProject } from "@/lib/projects";

export async function savePushSubscription(
  formData: FormData,
): Promise<ActionResult> {
  const { supabase, user, project } = await requireProject();

  const parsed = z
    .object({
      endpoint: z.string().url().max(2000),
      p256dh: z.string().min(8).max(500),
      auth: z.string().min(8).max(500),
    })
    .safeParse({
      endpoint: formData.get("endpoint"),
      p256dh: formData.get("p256dh"),
      auth: formData.get("auth"),
    });

  if (!parsed.success) {
    return { ok: false, error: "Suscripción push inválida." };
  }

  const { error } = await supabase.from("push_subscriptions").upsert(
    {
      user_id: user.id,
      project_id: project.id,
      endpoint: parsed.data.endpoint,
      p256dh: parsed.data.p256dh,
      auth: parsed.data.auth,
    },
    { onConflict: "user_id,endpoint" },
  );

  if (error) return { ok: false, error: error.message };
  revalidatePath("/app/agents");
  return { ok: true };
}
