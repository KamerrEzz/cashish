"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Field, inputClass, btnPrimary, Panel } from "@/components/ui";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    const supabase = createClient();
    const { error: authError } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (authError) {
      setError(authError.message);
      return;
    }
    setMessage("Revisa tu correo: te enviamos un enlace mágico para entrar.");
  }

  return (
    <Panel className="w-full max-w-md">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
        Cashish
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Finanzas personales con tarjetas de crédito de verdad: corte, pago y
        suscripciones.
      </p>
      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <Field label="Correo">
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="tu@email.com"
          />
        </Field>
        <button type="submit" className={btnPrimary} disabled={loading}>
          {loading ? "Enviando…" : "Entrar con enlace mágico"}
        </button>
      </form>
      {message ? (
        <p className="mt-4 text-sm text-[var(--accent-deep)]">{message}</p>
      ) : null}
      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
    </Panel>
  );
}
