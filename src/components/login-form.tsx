"use client";

import Link from "next/link";
import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import {
  authCallbackUrl,
  friendlyAuthError,
  safeNextPath,
} from "@/lib/auth-paths";
import { Field, inputClass, btnPrimary, btnGhost, Panel } from "@/components/ui";

type Mode = "magic" | "password";

export function LoginForm() {
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams.get("next"));
  const authErrorParam = searchParams.get("error");
  const [mode, setMode] = useState<Mode>("password");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(
    authErrorParam === "auth"
      ? "El enlace expiró o ya se usó. Pide uno nuevo o entra con contraseña."
      : null,
  );
  const [loading, setLoading] = useState(false);

  const registerHref =
    nextPath === "/app"
      ? "/register"
      : `/register?next=${encodeURIComponent(nextPath)}`;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    const supabase = createClient();
    const emailRedirectTo = authCallbackUrl(window.location.origin, nextPath);

    if (mode === "magic") {
      const { error: authError } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo,
          // Login only — new accounts go through /register
          shouldCreateUser: false,
        },
      });
      setLoading(false);
      if (authError) {
        setError(friendlyAuthError(authError.message));
        return;
      }
      setMessage(
        "Revisa tu correo: te enviamos un enlace mágico. Ábrelo en este mismo dispositivo.",
      );
      return;
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    if (!signInError) {
      window.location.href = nextPath;
      return;
    }
    setError(friendlyAuthError(signInError.message));
  }

  return (
    <Panel className="w-full max-w-md">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
        Entrar
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Accede a tu ledger de quincena, crédito y liquidez.
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
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={inputClass}
            placeholder="tu@email.com"
          />
        </Field>
        {mode === "password" ? (
          <Field label="Contraseña">
            <input
              type="password"
              required
              minLength={6}
              autoComplete="current-password"
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
              : "Entrar"}
        </button>
      </form>
      {message ? (
        <p className="mt-4 text-sm text-[var(--accent-deep)]">{message}</p>
      ) : null}
      {error ? (
        <p className="mt-4 text-sm text-[var(--danger-ink)]">{error}</p>
      ) : null}
      <p className="mt-6 text-sm text-[var(--muted)]">
        ¿No tienes cuenta?{" "}
        <Link
          href={registerHref}
          className="font-medium text-[var(--accent-deep)] underline-offset-2 hover:underline"
        >
          Crear cuenta
        </Link>
      </p>
    </Panel>
  );
}
