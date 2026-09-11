"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { uploadImportFile } from "@/app/actions/import";
import { SubmitButton } from "@/components/submit-button";
import { Field, inputClass } from "@/components/ui";

type AccountOption = { id: string; name: string };

export function ImportUploadForm({ accounts }: { accounts: AccountOption[] }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  async function onUpload(formData: FormData) {
    setError(null);
    try {
      const result = await uploadImportFile(formData);
      if (result && !result.ok) {
        setError(result.error);
        return;
      }
      router.refresh();
    } catch (err) {
      if (err && typeof err === "object" && "digest" in err) return;
      setError(err instanceof Error ? err.message : "No se pudo importar");
    }
  }

  return (
    <form action={onUpload} className="space-y-3">
      <Field label="Archivo CSV u OFX">
        <input
          type="file"
          name="file"
          required
          accept=".csv,.ofx,.qfx,text/csv,application/x-ofx"
          className={inputClass}
        />
      </Field>
      <Field label="Cuenta destino (opcional)">
        <select name="accountId" className={inputClass} defaultValue="">
          <option value="">Elegir después</option>
          {accounts.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </Field>
      {error ? (
        <p className="text-sm text-[var(--danger-ink)]">{error}</p>
      ) : null}
      <SubmitButton>Subir y revisar</SubmitButton>
    </form>
  );
}
