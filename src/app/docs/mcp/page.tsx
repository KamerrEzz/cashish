import Link from "next/link";
import { btnPrimary, btnGhost, Panel } from "@/components/ui";
import { TOOL_NAMES } from "@/lib/mcp/tool-names";

export const metadata = {
  title: "Cashish MCP — Agentes",
  description:
    "Conecta agentes de IA a tus finanzas personales con Model Context Protocol.",
};

const GROUPS: { title: string; prefix: string[] }[] = [
  {
    title: "Panorama",
    prefix: ["cashish_dashboard", "cashish_upcoming_events", "cashish_list_tools_help"],
  },
  {
    title: "Cuentas",
    prefix: [
      "cashish_list_accounts",
      "cashish_get_account",
      "cashish_create_account",
      "cashish_rename_account",
      "cashish_archive_account",
      "cashish_update_credit_card_profile",
    ],
  },
  {
    title: "Movimientos",
    prefix: [
      "cashish_list_transactions",
      "cashish_search_transactions",
      "cashish_get_transaction",
      "cashish_create_transaction",
    ],
  },
  {
    title: "Transferencias y pagos TDC",
    prefix: [
      "cashish_list_transfers",
      "cashish_create_transfer",
      "cashish_pay_credit_card",
      "cashish_pay_to_avoid_interest",
    ],
  },
  {
    title: "Cortes / estados de cuenta",
    prefix: [
      "cashish_list_statement_periods",
      "cashish_get_open_statement",
      "cashish_close_statement",
      "cashish_mark_statement_paid",
    ],
  },
  {
    title: "Suscripciones",
    prefix: [
      "cashish_list_subscriptions",
      "cashish_get_subscription",
      "cashish_create_subscription",
      "cashish_update_subscription",
      "cashish_toggle_subscription",
      "cashish_suggest_subscriptions",
    ],
  },
  {
    title: "Flujo / quincena / fase 3–4",
    prefix: [
      "cashish_cashflow_forecast",
      "cashish_quincena_plan",
      "cashish_list_receipts",
      "cashish_list_installments",
      "cashish_list_budgets",
    ],
  },
  {
    title: "Recordatorios",
    prefix: ["cashish_list_reminders", "cashish_dismiss_reminder"],
  },
];

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
          {TOOL_NAMES.length} herramientas para cuentas, cortes, pagos,
          suscripciones y recordatorios — sin tratar la TDC como débito.
        </p>

        <Panel className="mt-10">
          <h2 className="text-lg font-semibold">1. Crea una clave</h2>
          <p className="mt-2 text-sm text-[var(--muted)]">
            Entra a la app → <strong>Agentes</strong> → crea una clave (`csh_…`).
          </p>
          <Link href="/app/agents" className={`${btnPrimary} mt-4`}>
            Ir a Agentes
          </Link>
        </Panel>

        <Panel className="mt-4">
          <h2 className="text-lg font-semibold">2. Conecta el cliente</h2>
          <code className="mt-2 block rounded-lg bg-[var(--wash)] px-3 py-2 text-sm">
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

        {GROUPS.map((group) => (
          <Panel key={group.title} className="mt-4">
            <h2 className="text-lg font-semibold">{group.title}</h2>
            <ul className="mt-3 space-y-1 text-sm text-[var(--muted)]">
              {group.prefix.map((name) => (
                <li key={name}>
                  <code className="text-[var(--ink)]">{name}</code>
                </li>
              ))}
            </ul>
          </Panel>
        ))}

        <Panel className="mt-4">
          <h2 className="text-lg font-semibold">Convenciones</h2>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-[var(--muted)]">
            <li>Montos como string MXN: <code className="text-[var(--ink)]">&quot;229.50&quot;</code></li>
            <li>
              En TDC, <code className="text-[var(--ink)]">balance_cents</code> es
              deuda; disponible = límite − deuda
            </li>
            <li>
              Empieza con <code className="text-[var(--ink)]">cashish_list_tools_help</code>{" "}
              o <code className="text-[var(--ink)]">cashish_dashboard</code>
            </li>
          </ul>
        </Panel>
      </main>
    </div>
  );
}
