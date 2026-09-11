"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  createMcpApiKey,
  revokeMcpApiKey,
} from "@/app/actions/mcp-keys";
import { SubmitButton } from "@/components/submit-button";
import { Field, inputClass, btnGhost, btnPrimary, Panel } from "@/components/ui";

type KeyRow = {
  id: string;
  name: string;
  key_prefix: string;
  last_used_at: string | null;
  revoked_at: string | null;
  created_at: string;
};

export function AgentsPanel({
  keys,
  mcpUrl,
}: {
  keys: KeyRow[];
  mcpUrl: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [freshKey, setFreshKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function onCreate(formData: FormData) {
    setError(null);
    setFreshKey(null);
    const result = await createMcpApiKey(formData);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setFreshKey(result.rawKey);
    router.refresh();
  }

  async function onRevoke(id: string) {
    await revokeMcpApiKey(id);
    router.refresh();
  }

  const cursorSnippet = `{
  "mcpServers": {
    "cashish": {
      "url": "${mcpUrl}",
      "headers": {
        "Authorization": "Bearer ${freshKey ?? "csh_TU_CLAVE"}"
      }
    }
  }
}`;

  const stdioSnippet = `{
  "mcpServers": {
    "cashish": {
      "command": "npx",
      "args": [
        "-y",
        "mcp-remote",
        "${mcpUrl}",
        "--header",
        "Authorization: Bearer ${freshKey ?? "csh_TU_CLAVE"}"
      ]
    }
  }
}`;

  return (
    <div className="space-y-6">
      <Panel>
        <h2 className="font-semibold text-[var(--ink)]">Nueva clave de agente</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          La clave completa solo se muestra una vez. Úsala en Cursor, Claude u
          otro cliente MCP.
        </p>
        <form action={onCreate} className="mt-4 flex flex-wrap items-end gap-3">
          <Field label="Nombre">
            <input
              name="name"
              required
              className={inputClass}
              placeholder="Cursor laptop"
              defaultValue="Agente personal"
            />
          </Field>
          <SubmitButton>Crear clave</SubmitButton>
        </form>
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
        {freshKey ? (
          <div className="mt-4 rounded-xl bg-[var(--accent-soft)] p-4">
            <p className="text-sm font-medium text-[var(--accent-deep)]">
              Copia ahora — no se volverá a mostrar
            </p>
            <code className="mt-2 block break-all rounded-lg bg-white px-3 py-2 text-sm">
              {freshKey}
            </code>
            <button
              type="button"
              className={`${btnGhost} mt-3`}
              onClick={async () => {
                await navigator.clipboard.writeText(freshKey);
                setCopied(true);
              }}
            >
              {copied ? "Copiada" : "Copiar clave"}
            </button>
          </div>
        ) : null}
      </Panel>

      <Panel>
        <h2 className="font-semibold">Conectar en Cursor</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Endpoint MCP: <code className="text-[var(--ink)]">{mcpUrl}</code>
        </p>
        <pre className="mt-3 overflow-x-auto rounded-xl bg-[var(--wash)] p-4 text-xs leading-relaxed text-[var(--ink)]">
          {cursorSnippet}
        </pre>
        <p className="mt-4 text-sm text-[var(--muted)]">
          Clientes solo-stdio (vía mcp-remote):
        </p>
        <pre className="mt-2 overflow-x-auto rounded-xl bg-[var(--wash)] p-4 text-xs leading-relaxed">
          {stdioSnippet}
        </pre>
      </Panel>

      <Panel>
        <h2 className="font-semibold">Claves</h2>
        <ul className="mt-3 divide-y divide-[var(--line)]">
          {keys.length === 0 ? (
            <li className="py-2 text-sm text-[var(--muted)]">
              Aún no hay claves.
            </li>
          ) : (
            keys.map((k) => (
              <li
                key={k.id}
                className="flex flex-wrap items-center justify-between gap-3 py-3"
              >
                <div>
                  <p className="font-medium">
                    {k.name}
                    {k.revoked_at ? (
                      <span className="ml-2 text-xs text-red-700">revocada</span>
                    ) : null}
                  </p>
                  <p className="text-xs text-[var(--muted)]">
                    {k.key_prefix}… · creada {k.created_at.slice(0, 10)}
                    {k.last_used_at
                      ? ` · último uso ${k.last_used_at.slice(0, 10)}`
                      : ""}
                  </p>
                </div>
                {!k.revoked_at ? (
                  <button
                    type="button"
                    className={btnGhost}
                    onClick={() => onRevoke(k.id)}
                  >
                    Revocar
                  </button>
                ) : null}
              </li>
            ))
          )}
        </ul>
      </Panel>

      <Panel className="border-[var(--accent)]/20">
        <h2 className="font-semibold">Herramientas disponibles</h2>
        <ul className="mt-3 grid gap-2 text-sm text-[var(--muted)] sm:grid-cols-2">
          {[
            "cashish_dashboard",
            "cashish_list_accounts",
            "cashish_list_transactions",
            "cashish_create_transaction",
            "cashish_pay_credit_card",
            "cashish_list_subscriptions",
            "cashish_create_subscription",
            "cashish_list_reminders",
          ].map((name) => (
            <li key={name}>
              <code className="text-[var(--ink)]">{name}</code>
            </li>
          ))}
        </ul>
        <a href="/docs/mcp" className={`${btnPrimary} mt-4 inline-flex`}>
          Ver documentación MCP
        </a>
      </Panel>
    </div>
  );
}
