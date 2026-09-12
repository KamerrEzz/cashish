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
import { Field, inputClass, btnPrimary, Panel } from "@/components/ui";

export function RegisterForm() {
  const searchParams = useSearchParams();
  const nextPath = safeNextPath(searchParams.get("next"));
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loginHref =
    nextPath === "/app"
      ? "/login"
      : `/login?next=${encodeURIComponent(nextPath)}`;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setMessage(null);

    if (password !== confirm) {
      setError("Las contraseñas no coinciden.");
      return;
    }
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setLoading(true);
    const supabase = createClient();
    const emailRedirectTo = authCallbackUrl(window.location.origin, nextPath);

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo,
      },
    });
    setLoading(false);

    if (signUpError) {
      setError(friendlyAuthError(signUpError.message));
      return;
    }

    // Supabase may return a fake user with empty identities when email already exists
    // (to avoid enumeration) — treat as already registered.
    const identities = data.user?.identities ?? [];
    if (data.user && identities.length === 0) {
      setError(
        "Ese correo ya tiene cuenta. Entra con tu contraseña o enlace mágico.",
      );
      return;
    }

    if (data.session) {
      window.location.href = nextPath;
      return;
    }

    setMessage(
      "Cuenta creada. Revisa tu correo para confirmar y luego entra. Si no llega, mira spam o usa el enlace mágico en Entrar.",
    );
  }

  return (
    <Panel className="w-full max-w-md">
      <h1 className="font-[family-name:var(--font-display)] text-3xl text-[var(--ink)]">
        Crear cuenta
      </h1>
      <p className="mt-2 text-sm text-[var(--muted)]">
        Empieza tu ledger personal: cuentas, tarjetas y quincena en un solo
        lugar.
      </p>
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
        <Field label="Contraseña (mín. 6)">
          <input
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={inputClass}
            placeholder="••••••••"
          />
        </Field>
        <Field label="Confirmar contraseña">
          <input
            type="password"
            required
            minLength={6}
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={inputClass}
            placeholder="••••••••"
          />
        </Field>
        <button type="submit" className={btnPrimary} disabled={loading}>
          {loading ? "Creando…" : "Crear cuenta"}
        </button>
      </form>
      {message ? (
        <p className="mt-4 text-sm text-[var(--accent-deep)]">{message}</p>
      ) : null}
      {error ? (
        <p className="mt-4 text-sm text-[var(--danger-ink)]">{error}</p>
      ) : null}
      <p className="mt-6 text-sm text-[var(--muted)]">
        ¿Ya tienes cuenta?{" "}
        <Link
          href={loginHref}
          className="font-medium text-[var(--accent-deep)] underline-offset-2 hover:underline"
        >
          Entrar
        </Link>
      </p>
    </Panel>
  );
}
