import type { DocsNavItem, DocsSectionId } from "@/lib/docs/types";

export const DOCS_SECTIONS: {
  id: DocsSectionId;
  title: string;
  description: string;
}[] = [
  {
    id: "product",
    title: "Usar Cashish",
    description: "Cómo funciona cada parte del ledger para tu quincena y tu crédito.",
  },
  {
    id: "agents",
    title: "Para agentes",
    description: "Conecta agentes externos a tu proyecto con Model Context Protocol.",
  },
];

export const DOCS_NAV: DocsNavItem[] = [
  {
    href: "/docs/onboarding",
    title: "Onboarding",
    blurb: "Configura liquidez, TDC e ingreso en tres pasos.",
    section: "product",
  },
  {
    href: "/docs/quincena",
    title: "Quincena",
    blurb: "El ritual: ¿te alcanza hasta el próximo pago?",
    section: "product",
  },
  {
    href: "/docs/cuentas",
    title: "Cuentas",
    blurb: "Efectivo, débito, ahorros y tarjetas en un solo ledger.",
    section: "product",
  },
  {
    href: "/docs/tdc",
    title: "Tarjeta de crédito",
    blurb: "Deuda, cortes, mínimo y cómo evitar intereses.",
    section: "product",
  },
  {
    href: "/docs/movimientos",
    title: "Movimientos",
    blurb: "Captura, busca y exporta el historial del proyecto.",
    section: "product",
  },
  {
    href: "/docs/transferencias",
    title: "Transferencias",
    blurb: "Mueve dinero entre cuentas y paga la TDC.",
    section: "product",
  },
  {
    href: "/docs/suscripciones",
    title: "Suscripciones",
    blurb: "Cargos recurrentes y su peso en la quincena.",
    section: "product",
  },
  {
    href: "/docs/avisos",
    title: "Avisos",
    blurb: "Recordatorios de corte, pago y faltante de liquidez.",
    section: "product",
  },
  {
    href: "/docs/flujo",
    title: "Flujo de caja",
    blurb: "Proyección hacia adelante con ingresos, TDC y MSI.",
    section: "product",
  },
  {
    href: "/docs/presupuestos",
    title: "Presupuestos",
    blurb: "Sobres mensuales por categoría contra el gasto real.",
    section: "product",
  },
  {
    href: "/docs/analiticas",
    title: "Analíticas",
    blurb: "Resúmenes del mes, categorías y señales de crédito.",
    section: "product",
  },
  {
    href: "/docs/importar",
    title: "Importar",
    blurb: "Sube CSV u OFX, revisa el lote y aplícalo a una cuenta.",
    section: "product",
  },
  {
    href: "/docs/tickets",
    title: "Tickets",
    blurb: "Foto o PDF del ticket → borrador → movimiento confirmado.",
    section: "product",
  },
  {
    href: "/docs/asistente",
    title: "Asistente",
    blurb: "Chat con tu propia clave de modelo sobre datos reales.",
    section: "product",
  },
  {
    href: "/docs/proyectos",
    title: "Proyectos",
    blurb: "Ledgers separados, roles e invitaciones.",
    section: "product",
  },
  {
    href: "/docs/monedas",
    title: "Monedas",
    blurb: "MXN, COP, PEN y CLP por cuenta, sin conversión automática.",
    section: "product",
  },
  {
    href: "/docs/mcp",
    title: "MCP",
    blurb: "URL, claves csh_… y herramientas para agentes externos.",
    section: "agents",
  },
];

export function docsNavBySection(section: DocsSectionId) {
  return DOCS_NAV.filter((item) => item.section === section);
}

export function findDocsNav(pathname: string) {
  return DOCS_NAV.find(
    (item) => pathname === item.href || pathname.startsWith(`${item.href}/`),
  );
}
