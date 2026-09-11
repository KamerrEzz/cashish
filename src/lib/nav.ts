export const APP_NAV = [
  { href: "/app", label: "Inicio", exact: true },
  { href: "/app/accounts", label: "Cuentas" },
  { href: "/app/transactions", label: "Movimientos" },
  { href: "/app/analytics", label: "Analíticas" },
  { href: "/app/subscriptions", label: "Suscripciones" },
  { href: "/app/reminders", label: "Avisos" },
  { href: "/app/agents", label: "Agentes" },
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
