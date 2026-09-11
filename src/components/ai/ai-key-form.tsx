"use client";

import { useEffect, useState } from "react";
import { AI_PRESETS, type AiProviderId } from "@/lib/ai/catalog";
import { Field, inputClass, btnGhost, btnPrimary } from "@/components/ui";

type Meta = {
  configured: boolean;
  last4: string | null;
  provider?: AiProviderId;
  baseUrl?: string;
  chatModel?: string;
};

export function AiKeyForm() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [provider, setProvider] = useState<AiProviderId>("openai");
  const [baseUrl, setBaseUrl] = useState(AI_PRESETS.openai.baseUrl);
  const [chatModel, setChatModel] = useState(AI_PRESETS.openai.chatModel);
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const locked = provider !== "compatible";

  function applyPreset(id: AiProviderId, overlay?: Partial<Meta>) {
    const preset = AI_PRESETS[id];
    setProvider(id);
    setBaseUrl(overlay?.baseUrl || preset.baseUrl);
    setChatModel(overlay?.chatModel || preset.chatModel);
  }

  async function load() {
    const res = await fetch("/api/ai/key");
    const body = (await res.json()) as Meta & { error?: string };
    if (!res.ok) {
      setError(body.error || "No se pudo leer la clave");
      return;
    }
    setMeta({ configured: body.configured, last4: body.last4 ?? null });
    if (body.provider) applyPreset(body.provider, body);
  }

  useEffect(() => {
    void load();
  }, []);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setOk(null);
    if (!meta?.configured && !key.trim()) {
      setError("Pega una clave de API");
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/ai/key", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: key.trim() || undefined,
          provider,
          baseUrl,
          chatModel,
        }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "No se pudo guardar");
      setKey("");
      setMeta({ configured: true, last4: body.last4 });
      setOk("Clave guardada");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    setBusy(true);
    setError(null);
    setOk(null);
    try {
      const res = await fetch("/api/ai/key", { method: "DELETE" });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(body.error || "No se pudo quitar");
      setMeta({ configured: false, last4: null });
      setOk("Clave eliminada");
    } catch (err) {
      setError(err instanceof Error ? err.message : "No se pudo quitar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="space-y-4">
      <p className="text-sm text-[var(--muted)]">
        Clave del modelo (BYOK), cifrada en el servidor. Distinta de las claves MCP{" "}
        <code className="text-xs">csh_…</code> para agentes externos.
      </p>

      {meta?.configured ? (
        <p className="rounded-xl bg-[var(--wash)] px-3 py-2 text-sm text-[var(--ink)]">
          Activa · termina en <strong>{meta.last4}</strong>
        </p>
      ) : (
        <p className="rounded-xl bg-[var(--wash)] px-3 py-2 text-sm text-[var(--muted)]">
          Sin clave el asistente in-app no puede llamar al modelo.
        </p>
      )}

      <Field label="Proveedor">
        <select
          className={inputClass}
          value={provider}
          onChange={(e) => applyPreset(e.target.value as AiProviderId)}
        >
          {(Object.keys(AI_PRESETS) as AiProviderId[]).map((id) => (
            <option key={id} value={id}>
              {AI_PRESETS[id].label}
            </option>
          ))}
        </select>
      </Field>

      {!locked ? (
        <>
          <Field label="Base URL">
            <input
              className={inputClass}
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://…"
            />
          </Field>
          <Field label="Modelo de chat">
            <input
              className={inputClass}
              value={chatModel}
              onChange={(e) => setChatModel(e.target.value)}
              placeholder="gpt-4.1-mini"
            />
          </Field>
        </>
      ) : (
        <p className="text-xs text-[var(--muted)]">
          {AI_PRESETS[provider].hint} · modelo {AI_PRESETS[provider].chatModel}
        </p>
      )}

      <Field label={meta?.configured ? "Nueva clave (opcional)" : "Clave API"}>
        <input
          type="password"
          className={inputClass}
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="sk-…"
          autoComplete="off"
        />
      </Field>

      {error ? (
        <p className="text-sm text-[var(--danger-ink)]">{error}</p>
      ) : null}
      {ok ? <p className="text-sm text-[var(--positive)]">{ok}</p> : null}

      <div className="flex flex-wrap gap-2">
        <button type="submit" className={btnPrimary} disabled={busy}>
          {busy ? "Guardando…" : "Guardar"}
        </button>
        {meta?.configured ? (
          <button
            type="button"
            className={btnGhost}
            disabled={busy}
            onClick={() => void remove()}
          >
            Quitar clave
          </button>
        ) : null}
      </div>
    </form>
  );
}
