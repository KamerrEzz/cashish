import { describe, expect, it } from "vitest";
import {
  addMoney,
  asCurrency,
  formatMoney,
  formatMxn,
  money,
  parseMoneyInput,
  parseMxnInput,
  pctOf,
  sameMoney,
  splitEvenly,
  subMoney,
  sumByCurrency,
} from "./money";

describe("money", () => {
  it("rejects non-integer cents", () => {
    expect(() => money(10.5)).toThrow(/integer/);
  });

  it("adds and subtracts same currency", () => {
    const a = money(10050, "MXN");
    const b = money(50, "MXN");
    expect(addMoney(a, b)).toEqual(money(10100, "MXN"));
    expect(subMoney(a, b)).toEqual(money(10000, "MXN"));
  });

  it("refuses cross-currency arithmetic", () => {
    expect(() => addMoney(money(100, "MXN"), money(100, "COP"))).toThrow(
      /different currencies/,
    );
  });

  it("sameMoney is currency-aware", () => {
    expect(sameMoney(money(100, "MXN"), money(100, "MXN"))).toBe(true);
    expect(sameMoney(money(100, "MXN"), money(100, "COP"))).toBe(false);
  });

  it("pctOf rounds half-up", () => {
    expect(pctOf(money(100), 33.3)).toEqual(money(33));
  });

  it("splitEvenly reconciles remainder", () => {
    const parts = splitEvenly(money(100), 3);
    expect(parts.map((p) => p.amount)).toEqual([34, 33, 33]);
    expect(parts.reduce((s, p) => s + p.amount, 0)).toBe(100);
  });

  it("parseMxnInput and formatMxn round-trip presentation", () => {
    expect(parseMxnInput("229.50")).toEqual(money(22950, "MXN"));
    expect(formatMxn(money(22950, "MXN"))).toMatch(/229\.50/);
  });

  it("parses COP/PEN with 2 decimals and CLP as integers", () => {
    expect(parseMoneyInput("1000.50", "COP")).toEqual(money(100050, "COP"));
    expect(parseMoneyInput("99.99", "PEN")).toEqual(money(9999, "PEN"));
    expect(parseMoneyInput("15000", "CLP")).toEqual(money(15000, "CLP"));
    expect(() => parseMoneyInput("15000.50", "CLP")).toThrow(/enteros/);
  });

  it("formatMoney uses currency code", () => {
    expect(formatMoney(money(15000, "CLP"))).toMatch(/15.?000|CLP/);
    expect(formatMoney(money(25050, "PEN"))).toMatch(/25/);
  });

  it("sumByCurrency never mixes codes", () => {
    const totals = sumByCurrency([
      { amountCents: 100, currency: "MXN" },
      { amountCents: 200, currency: "MXN" },
      { amountCents: 50, currency: "COP" },
    ]);
    expect(totals).toEqual([money(300, "MXN"), money(50, "COP")]);
  });

  it("asCurrency falls back to MXN", () => {
    expect(asCurrency("PEN")).toBe("PEN");
    expect(asCurrency("XYZ")).toBe("MXN");
  });
});
