import { describe, it, expect } from "vitest";
import { deriveOutlookSummary } from "./outlook";
import { deriveSTMonths, effectiveSTMonths } from "../projection/projection";
import type { MonthlySnapshot } from "../../types/projection";
import type { RecurringTransaction } from "../../types/recurring";

const p = (
  month: string,
  totalLiquid: number,
  restschuld: number
): MonthlySnapshot => ({
  month,
  accounts: { m1: { projected: restschuld } },
  netCashflow: 0,
  totalLiquid,
});

const noST = new Map<string, number>();

describe("deriveOutlookSummary", () => {
  it("reports the final point's Total Liquid and year", () => {
    const points = [
      p("2026-01", 100000, 900000),
      p("2026-02", 120000, 900000),
      p("2028-12", 500000, 0),
    ];

    const s = deriveOutlookSummary(points, ["m1"], noST);

    expect(s.finalTotalLiquid).toBe(500000);
    expect(s.finalYear).toBe(2028);
  });

  it("reports the first month the Restschuld reaches zero as the debt-free month", () => {
    const points = [
      p("2026-01", 0, 900000),
      p("2026-10", 0, 720000),
      p("2027-10", 0, 0),
      p("2028-10", 0, 0),
    ];

    expect(deriveOutlookSummary(points, ["m1"], noST).debtFreeMonth).toBe(
      "2027-10"
    );
  });

  it("returns a null debt-free month when the mortgage never pays off", () => {
    const points = [p("2026-01", 0, 900000), p("2027-01", 0, 850000)];
    expect(deriveOutlookSummary(points, ["m1"], noST).debtFreeMonth).toBeNull();
  });

  it("returns a null debt-free month when there is no debt at all", () => {
    const points = [p("2026-01", 0, 0), p("2027-01", 0, 0)];
    expect(deriveOutlookSummary(points, ["m1"], noST).debtFreeMonth).toBeNull();
  });

  it("totals and counts Sondertilgung from the ST map, not from Restschuld step-downs", () => {
    // The Restschuld steps down every month (a monthly repayment), but only
    // two annual Sondertilgung payments are in the ST map.
    const points = [
      p("2026-10", 0, 900000),
      p("2026-11", 0, 600000),
      p("2026-12", 0, 590000),
      p("2027-11", 0, 200000),
      p("2027-12", 0, 190000),
    ];
    const stMonths = new Map<string, number>([
      ["2026-11", 250000],
      ["2027-11", 250000],
    ]);

    const s = deriveOutlookSummary(points, ["m1"], stMonths);

    expect(s.totalSondertilgung).toBe(500000);
    expect(s.sondertilgungCount).toBe(2);
  });

  it("reports zero Sondertilgung and zero payments for a monthly-only repayment", () => {
    // Restschuld falls every month, yet with no annual transfer the ST map is
    // empty — a monthly Darlehen is never a Sondertilgung.
    const points = [
      p("2026-01", 0, 500000),
      p("2026-02", 0, 400000),
      p("2026-03", 0, 300000),
      p("2026-04", 0, 200000),
    ];

    const s = deriveOutlookSummary(points, ["m1"], noST);

    expect(s.totalSondertilgung).toBe(0);
    expect(s.sondertilgungCount).toBe(0);
  });

  it("handles an empty projection without throwing", () => {
    const s = deriveOutlookSummary([], ["m1"], noST);
    expect(s.finalTotalLiquid).toBe(0);
    expect(s.totalSondertilgung).toBe(0);
    expect(s.sondertilgungCount).toBe(0);
    expect(s.debtFreeMonth).toBeNull();
  });
});

describe("deriveOutlookSummary — the real-world reference case", () => {
  // €955/month and €6,500 each November into the Mortgage, starting October
  // 2026 with €89,500 Restschuld: the loan is paid off in October 2031, so
  // the Novembers 2026–2030 are the only Sondertilgung that count.
  const MONTHLY = 95500;
  const ANNUAL = 650000;
  const START = 8950000;
  const MONTH_COUNT = 240;

  const recurring: RecurringTransaction[] = [
    {
      id: "r-monthly",
      accountId: "g1",
      amount: MONTHLY,
      description: "Darlehen",
      category: "Housing",
      frequency: "monthly",
      dayOfMonth: 1,
      linkedAccountId: "m1",
    },
    {
      id: "r-annual",
      accountId: "g1",
      amount: ANNUAL,
      description: "Sondertilgung",
      category: "Housing",
      frequency: "annual",
      dayOfMonth: 1,
      linkedAccountId: "m1",
      monthOfYear: 11,
    },
  ];
  const accounts = [
    { id: "g1", kind: "Girokonto" as const },
    { id: "m1", kind: "Mortgage" as const },
  ];

  const snapshots: MonthlySnapshot[] = [];
  let restschuld = START;
  for (let i = 0; i < MONTH_COUNT; i++) {
    const year = 2026 + Math.floor((9 + i) / 12);
    const monthNum = ((9 + i) % 12) + 1;
    const month = `${year}-${String(monthNum).padStart(2, "0")}`;
    if (i > 0) {
      restschuld -= MONTHLY;
      if (monthNum === 11) restschuld -= ANNUAL;
      restschuld = Math.max(0, restschuld);
    }
    snapshots.push({
      month,
      accounts: { m1: { projected: restschuld } },
      netCashflow: 0,
      totalLiquid: 0,
    });
  }

  const stMonths = effectiveSTMonths(
    deriveSTMonths(recurring, accounts, snapshots[0].month, MONTH_COUNT),
    snapshots,
    ["m1"]
  );

  it("pays off in October 2031 and totals €32,500 over 5 payments", () => {
    const s = deriveOutlookSummary(snapshots, ["m1"], stMonths);

    expect(s.debtFreeMonth).toBe("2031-10");

    expect(s.totalSondertilgung).toBe(3250000);
    expect(s.sondertilgungCount).toBe(5);
  });
});
