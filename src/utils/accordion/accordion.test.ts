import { describe, it, expect } from "vitest";
import { aggregateYearSummaries, type YearAggPoint } from "./accordion";

const pt = (
  month: string,
  totalLiquid: number,
  restschuld: number,
  netCashflow: number
): YearAggPoint => ({ month, totalLiquid, restschuld, netCashflow });

describe("aggregateYearSummaries", () => {
  const points: YearAggPoint[] = [
    pt("2026-01", 100, 900, 50),
    pt("2026-10", 200, 720, 60),
    pt("2026-12", 250, 720, 55),
    pt("2027-10", 400, 0, 70),
  ];

  it("produces one summary per year, in order", () => {
    const summaries = aggregateYearSummaries(points);
    expect(summaries.map((s) => s.year)).toEqual([2026, 2027]);
  });

  it("uses the year's final month for end-of-year Total Liquid and Restschuld", () => {
    const [y2026, y2027] = aggregateYearSummaries(points);
    expect(y2026.totalLiquid).toBe(250);
    expect(y2026.restschuld).toBe(720);
    expect(y2027.totalLiquid).toBe(400);
    expect(y2027.restschuld).toBe(0);
  });

  it("sums Net Cashflow across the months of the year", () => {
    const [y2026] = aggregateYearSummaries(points);
    expect(y2026.netCashflow).toBe(165); // 50 + 60 + 55
  });

  it("attributes each Restschuld step-down to the year of the month it occurred", () => {
    const [y2026, y2027] = aggregateYearSummaries(points);
    // 2026: 900 → 720 in October = 180
    expect(y2026.sondertilgung).toBe(180);
    // 2027: previous month (Dec 2026, 720) → 0 in October = 720
    expect(y2027.sondertilgung).toBe(720);
  });

  it("returns an empty array for no points", () => {
    expect(aggregateYearSummaries([])).toEqual([]);
  });
});
