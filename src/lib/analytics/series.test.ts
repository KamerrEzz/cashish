import { describe, expect, it } from "vitest";
import {
  buildCategoryBreakdown,
  buildDailyFlow,
  buildMerchantBars,
  monthCompare,
} from "./series";

const txs = [
  {
    type: "expense",
    amount_cents: 100_00,
    occurred_on: "2026-01-02",
    merchant: "OXXO",
    category: "Comida",
  },
  {
    type: "expense",
    amount_cents: 50_00,
    occurred_on: "2026-01-02",
    merchant: "Uber",
    category: "Transporte",
  },
  {
    type: "income",
    amount_cents: 1000_00,
    occurred_on: "2026-01-03",
    merchant: null,
    category: null,
  },
];

describe("analytics series", () => {
  it("builds daily flow including empty days", () => {
    const series = buildDailyFlow(txs, "2026-01-01", "2026-01-03");
    expect(series).toHaveLength(3);
    expect(series[0].expense).toBe(0);
    expect(series[1].expense).toBe(150);
    expect(series[2].income).toBe(1000);
  });

  it("breaks down categories", () => {
    const cats = buildCategoryBreakdown(txs);
    expect(cats[0].name).toBe("Comida");
    expect(cats.reduce((s, c) => s + c.pct, 0)).toBeGreaterThanOrEqual(99);
  });

  it("ranks merchants", () => {
    const bars = buildMerchantBars(txs, 5);
    expect(bars[0].name).toBe("OXXO");
  });

  it("compares months", () => {
    expect(monthCompare(120, 100).deltaPct).toBe(20);
    expect(monthCompare(50, 0).deltaPct).toBeNull();
  });
});
