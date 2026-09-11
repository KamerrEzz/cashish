export const APP_NAV = [
  { href: "/app", label: "Inicio", exact: true },
  { href: "/app/accounts", label: "Cuentas" },
  { href: "/app/transactions", label: "Movimientos" },
  { href: "/app/import", label: "Importar" },
  { href: "/app/receipts", label: "Tickets" },
  { href: "/app/cashflow", label: "Flujo" },
  { href: "/app/budgets", label: "Presupuestos" },
  { href: "/app/analytics", label: "Analíticas" },
  { href: "/app/subscriptions", label: "Suscripciones" },
  { href: "/app/reminders", label: "Avisos" },
  { href: "/app/ai", label: "Asistente" },
  { href: "/app/agents", label: "Agentes" },
  { href: "/app/projects", label: "Proyectos" },
] as const;

export type AppNavItem = (typeof APP_NAV)[number];

export function isNavActive(
  pathname: string,
  href: string,
  exact?: boolean,
): boolean {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}
