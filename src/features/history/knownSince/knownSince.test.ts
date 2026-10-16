import { describe, it, expect } from "vitest";
import type { HistoryPoint } from "../historyTypes/historyTypes";
import { firstKnownMonths, isUnknownMonth } from "./knownSince";

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
