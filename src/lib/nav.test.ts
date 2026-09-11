import { describe, expect, it } from "vitest";
import { APP_NAV, APP_NAV_MORE, APP_NAV_PRIMARY, isNavActive } from "./nav";
import {
  dailyBalancesFromForecast,
  quincenaWindowLabel,
} from "./quincena";
import { projectCashflow } from "./cashflow/engine";

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

  it("exposes primary then more labels", () => {
    expect(APP_NAV_PRIMARY.map((i) => i.label)).toEqual([
      "Inicio",
      "Quincena",
      "Cuentas",
      "Movimientos",
      "Asistente",
    ]);
    expect(APP_NAV_MORE[0].label).toBe("Importar");
    expect(APP_NAV.map((i) => i.label)).toEqual([
      ...APP_NAV_PRIMARY.map((i) => i.label),
      ...APP_NAV_MORE.map((i) => i.label),
    ]);
  });
});

describe("quincena helpers", () => {
  it("labels a 15-day window", () => {
    const w = quincenaWindowLabel("2026-01-10");
    expect(w.start).toBe("2026-01-10");
    expect(w.end).toBe("2026-01-24");
    expect(w.label).toContain("Quincena");
  });

  it("builds daily balances from forecast", () => {
    const forecast = projectCashflow({
      asOf: "2026-01-01",
      horizonDays: 5,
      startingLiquidCents: 1000_00,
      plannedInflows: [],
      subscriptions: [
        {
          id: "1",
          name: "X",
          amountCents: 100_00,
          nextBillingOn: "2026-01-03",
          frequency: "monthly",
        },
      ],
      creditObligations: [],
      installments: [],
    });
    const daily = dailyBalancesFromForecast(forecast);
    expect(daily).toHaveLength(6);
    expect(daily[0].balanceCents).toBe(1000_00);
    expect(daily[2].balanceCents).toBe(900_00);
  });
});
