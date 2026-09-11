import { describe, expect, it } from "vitest";
import {
  addMoney,
  formatMxn,
  money,
  parseMxnInput,
  pctOf,
  sameMoney,
  splitEvenly,
  subMoney,
} from "./money";

describe("money", () => {
  it("rejects non-integer cents", () => {
    expect(() => money(10.5)).toThrow(/integer/);
  });

  it("adds and subtracts same currency", () => {
    const a = money(10050);
    const b = money(50);
    expect(addMoney(a, b)).toEqual(money(10100));
    expect(subMoney(a, b)).toEqual(money(10000));
  });

  it("sameMoney is currency-aware", () => {
    expect(sameMoney(money(100), money(100))).toBe(true);
    expect(sameMoney(money(100), money(101))).toBe(false);
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
    expect(parseMxnInput("229.50")).toEqual(money(22950));
    expect(formatMxn(money(22950))).toMatch(/229\.50/);
  });
});
