import { describe, it, expect } from "vitest";
import type { MonthlySnapshot } from "../../types/projection";
import { accountBalanceSeries } from "./accountSeries";

function snap(
  month: string,
  entry: { projected: number; actual?: number } | undefined
): MonthlySnapshot {
  return {
    month,
    accounts: entry ? { a1: entry } : {},
    netCashflow: 0,
    totalLiquid: 0,
  };
}

describe("accountBalanceSeries", () => {
  it("returns the projected balance for the account at each month", () => {
    const snapshots = [
      snap("2026-01", { projected: 1000 }),
      snap("2026-02", { projected: 1200 }),
      snap("2026-03", { projected: 1500 }),
    ];
    expect(accountBalanceSeries(snapshots, "a1")).toEqual([1000, 1200, 1500]);
  });

  it("prefers the actual balance over the projected when present", () => {
    const snapshots = [
      snap("2026-01", { projected: 1000, actual: 1100 }),
      snap("2026-02", { projected: 1200 }),
    ];
    expect(accountBalanceSeries(snapshots, "a1")).toEqual([1100, 1200]);
  });

  it("treats a month with no entry for the account as zero", () => {
    const snapshots = [
      snap("2026-01", { projected: 1000 }),
      snap("2026-02", undefined),
    ];
    expect(accountBalanceSeries(snapshots, "a1")).toEqual([1000, 0]);
  });

  it("returns an empty series for no snapshots", () => {
    expect(accountBalanceSeries([], "a1")).toEqual([]);
  });
});
