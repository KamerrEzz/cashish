import { describe, expect, it } from "vitest";
import { parseBankCsv, parseOfx, fingerprintImportRow } from "@/lib/import/parse";
import { merchantKey } from "@/lib/merchant";
import {
  buildInstallmentSchedule,
  projectCashflow,
  suggestPayToAvoidInterest,
} from "@/lib/cashflow/engine";

describe("merchantKey", () => {
  it("normalizes accents and junk", () => {
    expect(merchantKey("Café OXXO #12")).toBe("cafeoxxo12");
    expect(merchantKey("  ")).toBeNull();
  });
});

describe("parseBankCsv", () => {
  it("parses MX-style CSV with fecha/monto/descripcion", () => {
    const csv = [
      "Fecha,Descripcion,Monto",
      "15/01/2026,OXXO CONDESA,-129.50",
      "16/01/2026,SPEI NOMINA,15000.00",
    ].join("\n");
    const rows = parseBankCsv(csv);
    expect(rows).toHaveLength(2);
    expect(rows[0].occurredOn).toBe("2026-01-15");
    expect(rows[0].type).toBe("expense");
    expect(rows[0].amountCents).toBe(12950);
    expect(rows[1].type).toBe("income");
    expect(rows[1].amountCents).toBe(1500000);
  });

  it("builds stable fingerprints", () => {
    const a = fingerprintImportRow({
      occurredOn: "2026-01-15",
      amountCents: 100,
      type: "expense",
      merchant: "OXXO",
    });
    const b = fingerprintImportRow({
      occurredOn: "2026-01-15",
      amountCents: 100,
      type: "expense",
      merchant: "oxxo",
    });
    expect(a).toBe(b);
  });
});

describe("parseOfx", () => {
  it("extracts STMTTRN blocks", () => {
    const ofx = `
<OFX><BANKMSGSRSV1><STMTTRNRS><STMTRS><BANKTRANLIST>
<STMTTRN>
<TRNTYPE>DEBIT
<DTPOSTED>20260115120000
<TRNAMT>-50.00
<NAME>UBER EATS
<MEMO>CDMX
</STMTTRN>
</BANKTRANLIST></STMTRS></STMTTRNRS></BANKMSGSRSV1></OFX>`;
    const rows = parseOfx(ofx);
    expect(rows).toHaveLength(1);
    expect(rows[0].amountCents).toBe(5000);
    expect(rows[0].type).toBe("expense");
    expect(rows[0].occurredOn).toBe("2026-01-15");
  });
});

describe("projectCashflow", () => {
  it("detects shortfall when subs exceed liquidity", () => {
    const result = projectCashflow({
      asOf: "2026-01-01",
      horizonDays: 30,
      startingLiquidCents: 100_00,
      plannedInflows: [],
      subscriptions: [
        {
          id: "1",
          name: "Netflix",
          amountCents: 229_00,
          nextBillingOn: "2026-01-05",
          frequency: "monthly",
        },
      ],
      creditObligations: [],
      installments: [],
    });
    expect(result.status).toBe("shortfall");
    expect(result.firstShortfallOn).toBe("2026-01-05");
    expect(result.shortfallCents).toBeGreaterThan(0);
  });

  it("stays coverage_ok with inflow covering obligations", () => {
    const result = projectCashflow({
      asOf: "2026-01-01",
      horizonDays: 30,
      startingLiquidCents: 50_00,
      plannedInflows: [
        {
          id: "p1",
          label: "Nómina",
          amountCents: 20_000_00,
          nextOn: "2026-01-03",
          frequency: "monthly",
        },
      ],
      subscriptions: [
        {
          id: "1",
          name: "Spotify",
          amountCents: 115_00,
          nextBillingOn: "2026-01-10",
          frequency: "monthly",
        },
      ],
      creditObligations: [
        {
          accountId: "a1",
          accountName: "Banorte",
          dueOn: "2026-01-15",
          minimumCents: 500_00,
          balanceCents: 5_000_00,
        },
      ],
      installments: [],
    });
    expect(result.status).toBe("coverage_ok");
    expect(result.endingLiquidCents).toBeGreaterThan(0);
  });
});

describe("MSI + pay suggestions", () => {
  it("builds installment schedule", () => {
    const s = buildInstallmentSchedule({
      totalCents: 1200_00,
      months: 6,
      firstDueOn: "2026-02-01",
    });
    expect(s.installmentCents).toBe(200_00);
    expect(s.months).toBe(6);
  });

  it("suggests avoid-interest from closing balance", () => {
    const s = suggestPayToAvoidInterest({
      closingBalanceCents: 3500_00,
      currentDebtCents: 4000_00,
      minimumCents: 200_00,
    });
    expect(s.avoidInterestCents).toBe(3500_00);
    expect(s.minimumCents).toBe(200_00);
  });
});
