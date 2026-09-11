import { describe, expect, it } from "vitest";
import { APP_NAV, isNavActive } from "./nav";

describe("isNavActive", () => {
  it("matches exact /app only when exact", () => {
    expect(isNavActive("/app", "/app", true)).toBe(true);
    expect(isNavActive("/app/accounts", "/app", true)).toBe(false);
  });

  it("matches nested routes without exact", () => {
    expect(isNavActive("/app/accounts", "/app/accounts")).toBe(true);
    expect(isNavActive("/app/accounts/abc", "/app/accounts")).toBe(true);
    expect(isNavActive("/app/transactions", "/app/accounts")).toBe(false);
  });

  it("exposes full primary nav labels", () => {
    expect(APP_NAV.map((i) => i.label)).toEqual([
      "Inicio",
      "Cuentas",
      "Movimientos",
      "Importar",
      "Tickets",
      "Flujo",
      "Presupuestos",
      "Analíticas",
      "Suscripciones",
      "Avisos",
      "Asistente",
      "Agentes",
      "Proyectos",
    ]);
  });
});
