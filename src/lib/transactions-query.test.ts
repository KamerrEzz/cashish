import { describe, expect, it } from "vitest";
import {
  buildExportFilename,
  defaultMonthRange,
  filtersToSearchParams,
  parseTransactionFilters,
  resolveDateRange,
  transactionsToCsv,
  typeLabel,
} from "./transactions-query";

describe("parseTransactionFilters", () => {
  it("parses search params with defaults", () => {
    const f = parseTransactionFilters(new URLSearchParams("q=netflix&type=expense&page=2"));
    expect(f.q).toBe("netflix");
    expect(f.type).toBe("expense");
    expect(f.page).toBe(2);
  });

  it("rejects invalid dates and types", () => {
    const f = parseTransactionFilters({ from: "nope", type: "hack", page: "0" });
    expect(f.from).toBe("");
    expect(f.type).toBe("all");
    expect(f.page).toBe(1);
  });
});

describe("date ranges", () => {
  it("defaults to calendar month", () => {
    expect(defaultMonthRange("2026-09-11")).toEqual({
      from: "2026-09-01",
      to: "2026-09-30",
    });
  });

  it("uses explicit from/to when provided", () => {
    const r = resolveDateRange(
      {
        q: "",
        type: "all",
        accountId: "",
        category: "",
        from: "2026-01-01",
        to: "",
        page: 1,
      },
      "2026-09-11",
    );
    expect(r.from).toBe("2026-01-01");
    expect(r.to).toBe("2026-09-11");
    expect(r.usingDefault).toBe(false);
  });
});

describe("CSV export", () => {
  it("emits BOM and accountant-friendly columns", () => {
    const csv = transactionsToCsv([
      {
        occurred_on: "2026-09-01",
        type: "expense",
        transfer_id: null,
        account_name: "Nu Oro",
        merchant: 'Cafe "Central"',
        description: null,
        category: "Comida",
        amount_cents: 12550,
        currency: "MXN",
        id: "abc",
      },
    ]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    expect(csv).toContain("Fecha,Tipo,Cuenta");
    expect(csv).toContain("Gasto");
    expect(csv).toContain('Cafe ""Central""');
    expect(csv).toContain("-125.50");
  });

  it("labels transfer rows", () => {
    expect(typeLabel("expense", "tid")).toBe("Transferencia");
  });

  it("builds stable filenames", () => {
    expect(buildExportFilename("2026-09-01", "2026-09-30", "2026-09-11")).toBe(
      "cashish-movimientos_2026-09-01_2026-09-30.csv",
    );
  });

  it("omits default page from search params", () => {
    const sp = filtersToSearchParams({ type: "all", page: 1, q: "x" });
    expect(sp.get("q")).toBe("x");
    expect(sp.get("page")).toBeNull();
    expect(sp.get("type")).toBeNull();
  });
});
