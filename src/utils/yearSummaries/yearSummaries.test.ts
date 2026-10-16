import { describe, it, expect } from "vitest";
import { aggregateYearSummaries, type YearAggPoint } from "./yearSummaries";

const pt = (
  month: string,
  totalLiquid: number,
  restschuld: number,
  netCashflow: number,
  accounts: Record<string, number> = {}
): YearAggPoint => ({ month, totalLiquid, restschuld, netCashflow, accounts });

describe("aggregateYearSummaries", () => {
  const points: YearAggPoint[] = [
    pt("2026-01", 100, 900, 50, { g1: 60, t1: 40 }),
    pt("2026-10", 200, 720, 60, { g1: 120, t1: 80 }),
    pt("2026-12", 250, 720, 55, { g1: 150, t1: 100 }),
    pt("2027-10", 400, 0, 70, { g1: 300, t1: 100 }),
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

  it("gives each account its end-of-year projected balance", () => {
    const [y2026, y2027] = aggregateYearSummaries(points);
    expect(y2026.accounts).toEqual({ g1: 150, t1: 100 });
    expect(y2027.accounts).toEqual({ g1: 300, t1: 100 });
  });

  it("takes a partial year's balances from its last available month", () => {
    const [, y2027] = aggregateYearSummaries(points);
    // 2027 stops at October — October's balances are the year's closing ones.
    expect(y2027.accounts.g1).toBe(300);
  });

  it("no longer derives a Sondertilgung figure from Restschuld step-downs", () => {
    const [y2026, y2027] = aggregateYearSummaries(points);
    expect(y2026).not.toHaveProperty("sondertilgung");
    expect(y2027).not.toHaveProperty("sondertilgung");
  });

  it("returns an empty array for no points", () => {
    expect(aggregateYearSummaries([])).toEqual([]);
  });
});
