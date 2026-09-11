"use client";

import { useState } from "react";
import type { ActionResult } from "@/app/actions/accounts";
import { SubmitButton } from "@/components/submit-button";
import { Field, inputClass } from "@/components/ui";

export function InviteForm({
  projectId,
  inviteAction,
}: {
  projectId: string;
  inviteAction: (formData: FormData) => Promise<ActionResult>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState(false);

  async function onInvite(formData: FormData) {
    setError(null);
    setOk(false);
    formData.set("projectId", projectId);
    const result = await inviteAction(formData);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOk(true);
  }

  return (
    <form action={onInvite} className="space-y-3">
      <Field label="Correo">
        <input
          type="email"
          name="email"
          required
          className={inputClass}
          placeholder="alguien@correo.com"
        />
      </Field>
      <Field label="Rol">
        <select name="role" className={inputClass} defaultValue="member">
          <option value="member">Miembro (escribe)</option>
          <option value="viewer">Solo lectura</option>
        </select>
      </Field>
      {error ? (
        <p className="text-sm text-[var(--danger-ink)]">{error}</p>
      ) : null}
      {ok ? (
        <p className="text-sm text-[var(--accent-deep)]">
          Invitación creada. Si Resend está activo, ya salió el correo.
        </p>
      ) : null}
      <SubmitButton>Enviar invitación</SubmitButton>
    </form>
  );
}
