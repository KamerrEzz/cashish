"use client";

import { useState } from "react";
import { createProject } from "@/app/actions/projects";
import { SubmitButton } from "@/components/submit-button";
import { Field, inputClass } from "@/components/ui";

export function CreateProjectForm() {
  const [error, setError] = useState<string | null>(null);

  async function onCreate(formData: FormData) {
    setError(null);
    try {
      const result = await createProject(formData);
      if (result && !result.ok) {
        setError(result.error);
      }
    } catch (err) {
      if (err && typeof err === "object" && "digest" in err) return;
      setError(err instanceof Error ? err.message : "No se pudo crear");
    }
  }

  return (
    <form action={onCreate} className="mt-4 max-w-md space-y-3">
      <Field label="Nombre">
        <input
          name="name"
          required
          maxLength={80}
          className={inputClass}
          placeholder="Casa, Viaje CDMX, Negocio…"
        />
      </Field>
      {error ? (
        <p className="text-sm text-[var(--danger-ink)]">{error}</p>
      ) : null}
      <SubmitButton>Crear proyecto</SubmitButton>
    </form>
  );
}
