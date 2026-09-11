"use client";

import { useState } from "react";
import type { ActionResult } from "@/app/actions/accounts";
import { SubmitButton } from "@/components/submit-button";

export function AcceptInviteForm({
  token,
  acceptAction,
}: {
  token: string;
  acceptAction: (formData: FormData) => Promise<ActionResult>;
}) {
  const [error, setError] = useState<string | null>(null);

  async function onAccept(formData: FormData) {
    setError(null);
    formData.set("token", token);
    try {
      const result = await acceptAction(formData);
      if (result && !result.ok) {
        setError(result.error);
      }
    } catch (err) {
      // redirect() throws; ignore navigation errors
      if (err && typeof err === "object" && "digest" in err) return;
      setError(err instanceof Error ? err.message : "No se pudo aceptar");
    }
  }

  return (
    <form action={onAccept} className="space-y-3">
      {error ? (
        <p className="text-sm text-[var(--danger-ink)]">{error}</p>
      ) : null}
      <SubmitButton>Aceptar e ir al proyecto</SubmitButton>
    </form>
  );
}
