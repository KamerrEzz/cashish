import { describe, expect, it } from "vitest";
import {
  availableCreditCents,
  buildInitialStatementWindow,
} from "./credit-cycle";

describe("credit-cycle", () => {
  it("computes available credit", () => {
    expect(availableCreditCents(50_000_00, 12_500_00)).toBe(37_500_00);
  });

  it("builds a statement window with due after close", () => {
    const window = buildInitialStatementWindow(
      15,
      28,
      new Date("2026-09-10T12:00:00"),
    );
    expect(window.closesOn).toBe("2026-09-15");
    expect(window.dueOn).toBe("2026-09-28");
    expect(window.opensOn < window.closesOn).toBe(true);
  });
});
