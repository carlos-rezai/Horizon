import { describe, it, expect } from "vitest";
import type { HistoryPoint } from "../../../types/history";
import {
  firstKnownMonthOf,
  firstKnownMonths,
  isUnknownMonth,
  knownYears,
} from "./knownSince";

function point(overrides: Partial<HistoryPoint>): HistoryPoint {
  return {
    month: "2026-01",
    totalLiquid: null,
    restschuld: null,
    netCashflow: 0,
    accounts: {},
    ...overrides,
  };
}

describe("firstKnownMonths", () => {
  it("gives the first month for every series of an all-known history", () => {
    const points = [
      point({
        month: "2026-01",
        totalLiquid: 1000,
        restschuld: 0,
        accounts: { giro: 1000 },
      }),
      point({
        month: "2026-02",
        totalLiquid: 1200,
        restschuld: 0,
        accounts: { giro: 1200 },
      }),
    ];

    expect(firstKnownMonths(points)).toEqual({
      totalLiquid: "2026-01",
      restschuld: "2026-01",
      giro: "2026-01",
    });
  });

  it("gives the first non-null month for a series that starts Unknown", () => {
    const points = [
      point({ month: "2026-01", restschuld: 0, accounts: { giro: null } }),
      point({
        month: "2026-02",
        totalLiquid: 1200,
        restschuld: 0,
        accounts: { giro: 1200 },
      }),
    ];

    expect(firstKnownMonths(points)).toEqual({
      totalLiquid: "2026-02",
      restschuld: "2026-01",
      giro: "2026-02",
    });
  });

  it("leaves out a series that is never known", () => {
    const points = [
      point({
        month: "2026-01",
        totalLiquid: 1000,
        accounts: { giro: 1000, haus: null },
      }),
      point({
        month: "2026-02",
        totalLiquid: 1200,
        accounts: { giro: 1200, haus: null },
      }),
    ];

    const first = firstKnownMonths(points);
    expect(first).not.toHaveProperty("restschuld");
    expect(first).not.toHaveProperty("haus");
    expect(first.giro).toBe("2026-01");
  });
});

describe("isUnknownMonth", () => {
  it("is true when every series is null", () => {
    expect(
      isUnknownMonth(point({ accounts: { giro: null, haus: null } }))
    ).toBe(true);
  });

  it("is false for a partially known month", () => {
    expect(
      isUnknownMonth(point({ accounts: { giro: 1000, haus: null } }))
    ).toBe(false);
  });

  it("is false when only the Restschuld is known", () => {
    expect(isUnknownMonth(point({ restschuld: 0 }))).toBe(false);
  });
});

describe("firstKnownMonthOf", () => {
  it("gives the first month the field is non-null", () => {
    const points = [
      point({ month: "2026-01", monthlySavings: null }),
      point({ month: "2026-02", monthlySavings: 5000 }),
      point({ month: "2026-03", monthlySavings: -2000 }),
    ];

    expect(firstKnownMonthOf(points, "monthlySavings")).toBe("2026-02");
  });

  it("counts a real 0 as known", () => {
    const points = [
      point({ month: "2026-01", monthlySpending: null }),
      point({ month: "2026-02", monthlySpending: 0 }),
    ];

    expect(firstKnownMonthOf(points, "monthlySpending")).toBe("2026-02");
  });

  it("treats an absent optional field as Unknown", () => {
    const points = [
      point({ month: "2026-01" }),
      point({ month: "2026-02", monthlySavings: 1000 }),
    ];

    expect(firstKnownMonthOf(points, "monthlySavings")).toBe("2026-02");
  });

  it("gives null when the field is never known", () => {
    const points = [point({ month: "2026-01" }), point({ month: "2026-02" })];

    expect(firstKnownMonthOf(points, "monthlySpending")).toBeNull();
  });
});

describe("knownYears", () => {
  it("lists every year with a known month, newest first", () => {
    const points = [
      point({ month: "2024-06", totalLiquid: 100000 }),
      point({ month: "2025-01", accounts: { g1: 50000 } }),
      point({ month: "2026-03", restschuld: 300000 }),
    ];

    expect(knownYears(points)).toEqual([2026, 2025, 2024]);
  });

  it("lists a year once however many of its months are known", () => {
    const points = [
      point({ month: "2026-01", totalLiquid: 100000 }),
      point({ month: "2026-02", totalLiquid: 110000 }),
    ];

    expect(knownYears(points)).toEqual([2026]);
  });

  it("leaves out a year whose months are all Unknown", () => {
    const points = [
      point({ month: "2024-12" }),
      point({ month: "2025-01", totalLiquid: 100000 }),
    ];

    expect(knownYears(points)).toEqual([2025]);
  });

  it("leaves out a year that only the Paydown Bridge crosses", () => {
    // The bridge is not monthly data, so a bridge-only month is Unknown.
    const points = [
      point({ month: "2023-06", restschuldBridge: 40000000 }),
      point({ month: "2024-01", restschuldBridge: 38000000 }),
      point({
        month: "2025-01",
        restschuld: 36000000,
        restschuldBridge: 36000000,
      }),
    ];

    expect(knownYears(points)).toEqual([2025]);
  });

  it("gives no years for no points", () => {
    expect(knownYears([])).toEqual([]);
  });
});
