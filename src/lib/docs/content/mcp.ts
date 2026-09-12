import type { DocsArticle } from "@/lib/docs/types";
import { TOOL_NAMES } from "@/lib/mcp/tool-names";

const GROUPS: { title: string; tools: string[] }[] = [
  {
    title: "Panorama",
    tools: [
      "cashish_dashboard",
      "cashish_upcoming_events",
      "cashish_list_tools_help",
      "cashish_quincena_plan",
    ],
  },
  {
    title: "Cuentas",
    tools: [
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
    tools: [
      "cashish_list_transactions",
      "cashish_search_transactions",
      "cashish_get_transaction",
      "cashish_create_transaction",
    ],
  },
  {
    title: "Transferencias y pagos TDC",
    tools: [
      "cashish_list_transfers",
      "cashish_create_transfer",
      "cashish_pay_credit_card",
      "cashish_pay_to_avoid_interest",
    ],
  },
  {
    title: "Cortes / estados",
    tools: [
      "cashish_list_statement_periods",
      "cashish_get_open_statement",
      "cashish_close_statement",
      "cashish_mark_statement_paid",
    ],
  },
  {
    title: "Suscripciones",
    tools: [
      "cashish_list_subscriptions",
      "cashish_get_subscription",
      "cashish_create_subscription",
      "cashish_update_subscription",
      "cashish_toggle_subscription",
      "cashish_suggest_subscriptions",
    ],
  },
  {
    title: "Flujo / fase 3–4",
    tools: [
      "cashish_cashflow_forecast",
      "cashish_list_receipts",
      "cashish_list_installments",
      "cashish_list_budgets",
    ],
  },
  {
    title: "Recordatorios",
    tools: ["cashish_list_reminders", "cashish_dismiss_reminder"],
  },
];

const mcpUrl = "https://cashish-beta.vercel.app/api/mcp";

export const mcpArticle: DocsArticle = {
  slug: "mcp",
  title: "MCP — Agentes",
  description:
    "Conecta agentes externos a tu proyecto Cashish con Model Context Protocol.",
  lead: `${TOOL_NAMES.length} herramientas para cuentas, cortes, pagos, suscripciones y quincena — sin tratar la TDC como débito. La clave queda atada al proyecto donde la creaste.`,
  sections: [
    {
      id: "setup",
      title: "Configuración",
      blocks: [
        {
          type: "steps",
          title: "Camino rápido",
          items: [
            "Entra a la app → Agentes → crea una clave (csh_…). Elige el proyecto correcto.",
            "En tu cliente MCP (Cursor, Claude Desktop, etc.) pega la URL y el Bearer.",
            "Empieza con cashish_list_tools_help o cashish_dashboard.",
          ],
        },
        {
          type: "code",
          title: "Endpoint",
          code: mcpUrl,
        },
        {
          type: "code",
          title: "Ejemplo de config (Cursor / clientes JSON)",
          language: "json",
          code: `{
  "mcpServers": {
    "cashish": {
      "url": "${mcpUrl}",
      "headers": {
        "Authorization": "Bearer csh_TU_CLAVE"
      }
    }
  }
}`,
        },
      ],
    },
    {
      id: "convenciones",
      title: "Convenciones",
      blocks: [
        {
          type: "list",
          items: [
            'Montos como string decimal según la moneda de la cuenta: "229.50". CLP sin centavos.',
            "En TDC, balance_cents es deuda; disponible = límite − deuda.",
            "La clave MCP no es tu BYOK del Asistente: una abre agentes externos; la otra alimenta el chat in-app.",
            "confirm: false en herramientas de pago suele devolver preview sin ejecutar.",
          ],
        },
        {
          type: "callout",
          kind: "tip",
          text: "Si el agente “no ve” cuentas, revisa que la clave se creó en el proyecto que esperas. Cada csh_… está scoped.",
        },
      ],
    },
    ...GROUPS.map((group) => ({
      id: group.title.toLowerCase().replace(/[^a-z0-9]+/gi, "-"),
      title: group.title,
      blocks: [
        {
          type: "list" as const,
          items: group.tools.map((name) => name),
        },
      ],
    })),
  ],
};
