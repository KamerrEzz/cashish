import Link from "next/link";
import { btnPrimary, btnGhost, Panel } from "@/components/ui";

export const metadata = {
  title: "Cashish MCP — Agentes",
  description:
    "Conecta agentes de IA a tus finanzas personales con Model Context Protocol.",
};

export default function McpDocsPage() {
  const mcpUrl = "https://cashish-beta.vercel.app/api/mcp";

  return (
    <div className="min-h-full bg-[var(--wash)]">
      <header className="border-b border-[var(--line)] bg-[var(--surface)]/90">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
          <Link
            href="/"
            className="font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--accent-deep)]"
          >
            Cashish
          </Link>
          <Link href="/login" className={btnGhost}>
            Entrar
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-12">
        <p className="text-sm font-medium uppercase tracking-wide text-[var(--accent)]">
          Model Context Protocol
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-display)] text-4xl tracking-tight text-[var(--ink)]">
          Agentes que entienden tu crédito
        </h1>
        <p className="mt-4 text-lg text-[var(--muted)]">
          Expón cuentas, cortes, pagos y suscripciones a Cursor, Claude u otros
          clientes MCP con una clave personal. Sin tratar la TDC como débito.
        </p>

        <Panel className="mt-10">
          <h2 className="text-lg font-semibold">1. Crea una clave</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Entra a la app → <strong>Agentes</strong> → crea una clave. Se
            muestra una sola vez (`csh_…`).
          </p>
          <Link href="/app/agents" className={`${btnPrimary} mt-4`}>
            Ir a Agentes
          </Link>
        </Panel>

        <Panel className="mt-4">
          <h2 className="text-lg font-semibold">2. Conecta el cliente</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">Endpoint:</p>
          <code className="mt-1 block rounded-lg bg-[var(--wash)] px-3 py-2 text-sm">
            {mcpUrl}
          </code>
          <pre className="mt-4 overflow-x-auto rounded-xl bg-[var(--wash)] p-4 text-xs">{`{
  "mcpServers": {
    "cashish": {
      "url": "${mcpUrl}",
      "headers": {
        "Authorization": "Bearer csh_TU_CLAVE"
      }
    }
  }
}`}</pre>
        </Panel>

        <Panel className="mt-4">
          <h2 className="text-lg font-semibold">3. Herramientas</h2>
          <ul className="mt-3 space-y-2 text-sm text-[var(--muted)]">
            <li>
              <code className="text-[var(--ink)]">cashish_dashboard</code> —
              panorama de liquidez y TDC
            </li>
            <li>
              <code className="text-[var(--ink)]">cashish_list_accounts</code> /
              <code className="text-[var(--ink)]"> cashish_list_transactions</code>
            </li>
            <li>
              <code className="text-[var(--ink)]">cashish_create_transaction</code>{" "}
              — gasto o ingreso
            </li>
            <li>
              <code className="text-[var(--ink)]">cashish_pay_credit_card</code> —
              pago vinculado
            </li>
            <li>
              <code className="text-[var(--ink)]">cashish_list_subscriptions</code>{" "}
              /
              <code className="text-[var(--ink)]"> cashish_create_subscription</code>
            </li>
            <li>
              <code className="text-[var(--ink)]">cashish_list_reminders</code>
            </li>
          </ul>
        </Panel>
      </main>
    </div>
  );
}
