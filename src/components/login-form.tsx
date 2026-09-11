"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Field, inputClass, btnPrimary, btnGhost, Panel } from "@/components/ui";

type Mode = "magic" | "password";

export function LoginForm() {
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    const supabase = createClient();

    if (mode === "magic") {
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
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    if (!signInError) {
      window.location.href = "/app";
      return;
    }

    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    setLoading(false);
    if (signUpError) {
      setError(signInError.message || signUpError.message);
      return;
    }
    setMessage(
      "Cuenta creada. Si pide confirmar correo, revisa tu inbox; si no, recarga e intenta entrar de nuevo.",
    );
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
      <div className="mt-4 flex gap-2">
        <button
          type="button"
          className={mode === "password" ? btnPrimary : btnGhost}
          onClick={() => setMode("password")}
        >
          Email + contraseña
        </button>
        <button
          type="button"
          className={mode === "magic" ? btnPrimary : btnGhost}
          onClick={() => setMode("magic")}
        >
          Enlace mágico
        </button>
      </div>
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
        {mode === "password" ? (
          <Field label="Contraseña (mín. 6)">
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={inputClass}
              placeholder="••••••••"
            />
          </Field>
        ) : null}
        <button type="submit" className={btnPrimary} disabled={loading}>
          {loading
            ? "Espera…"
            : mode === "magic"
              ? "Enviar enlace"
              : "Entrar / registrarme"}
        </button>
      </form>
      {message ? (
        <p className="mt-4 text-sm text-[var(--accent-deep)]">{message}</p>
      ) : null}
      {error ? <p className="mt-4 text-sm text-red-700">{error}</p> : null}
    </Panel>
  );
}
