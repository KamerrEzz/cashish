import { describe, expect, it } from "vitest";
import { buildQuincenaPlanActions } from "./quincena-plan";
import type { QuincenaSnapshot } from "./quincena";

function baseSnapshot(
  overrides: Partial<QuincenaSnapshot> = {},
): QuincenaSnapshot {
  return {
    today: "2026-09-11",
    window: {
      start: "2026-09-11",
      end: "2026-09-25",
      label: "Quincena del 11 sep – 25 sep",
    },
    forecast: {
      asOf: "2026-09-11",
      horizonDays: 30,
      startingLiquidCents: 20_000_00,
      endingLiquidCents: 15_000_00,
      minBalanceCents: 12_000_00,
      status: "coverage_ok",
      shortfallCents: 0,
      firstShortfallOn: null,
      events: [],
    },
    daily: [],
    primaryPay: null,
    upcomingSubs: [],
    upcomingCloses: [],
    ...overrides,
  };
}

describe("buildQuincenaPlanActions", () => {
  it("builds confirmable pay actions from previews", () => {
    const plan = buildQuincenaPlanActions(baseSnapshot(), [
      {
        accountId: "11111111-1111-1111-1111-111111111111",
        accountName: "BBVA",
        mode: "avoid_interest",
        amountCents: 4500_00,
        dueOn: "2026-09-20",
        fromAccountId: "22222222-2222-2222-2222-222222222222",
      },
    ]);

    expect(plan.coverageOk).toBe(true);
    expect(plan.actions).toHaveLength(1);
    expect(plan.actions[0]).toMatchObject({
      type: "pay_card",
      confirm: true,
      mode: "avoid_interest",
      amountCents: 4500_00,
      accountName: "BBVA",
    });
    expect(plan.actions[0].label).toContain("sin intereses");
  });

  it("skips zero-amount previews and notes shortfall", () => {
    const plan = buildQuincenaPlanActions(
      baseSnapshot({
        forecast: {
          asOf: "2026-09-11",
          horizonDays: 30,
          startingLiquidCents: 1000_00,
          endingLiquidCents: -500_00,
          minBalanceCents: -500_00,
          status: "shortfall",
          shortfallCents: 500_00,
          firstShortfallOn: "2026-09-18",
          events: [],
        },
        upcomingSubs: [
          {
            id: "s1",
            name: "Netflix",
            amountCents: 229_00,
            nextBillingOn: "2026-09-15",
          },
        ],
      }),
      [
        {
          accountId: "a",
          accountName: "X",
          mode: "minimum",
          amountCents: 0,
          dueOn: "2026-09-20",
        },
      ],
    );

    expect(plan.coverageOk).toBe(false);
    expect(plan.actions).toHaveLength(0);
    expect(plan.notes.some((n) => n.includes("Faltante"))).toBe(true);
    expect(plan.notes.some((n) => n.includes("Netflix"))).toBe(true);
  });
});
