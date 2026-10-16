import { describe, it, expect } from "vitest";
import type { HistoryPoint } from "../historyTypes/historyTypes";
import { paydownBridgeSpan } from "./paydownBridge";

function point(overrides: Partial<HistoryPoint>): HistoryPoint {
  return {
    month: "2026-01",
    totalLiquid: null,
    restschuld: null,
    restschuldBridge: null,
    netCashflow: 0,
    accounts: {},
    ...overrides,
  };
}

describe("paydownBridgeSpan", () => {
  it("gives null when no month carries a bridge value", () => {
    const points = [
      point({ month: "2026-01", restschuld: 300000 }),
      point({ month: "2026-02", restschuld: 290000 }),
    ];

    expect(paydownBridgeSpan(points)).toBeNull();
  });

  it("spans every bridged month, from the Mortgage Start month to the join", () => {
    // Mortgage Start 2023-01 at an Original Principal of 400 000; the
    // Restschuld is first known in 2023-04 at 370 000.
    const points = [
      point({ month: "2023-01", restschuldBridge: 40000000 }),
      point({ month: "2023-02", restschuldBridge: 39000000 }),
      point({ month: "2023-03", restschuldBridge: 38000000 }),
      point({
        month: "2023-04",
        restschuld: 37000000,
        restschuldBridge: 37000000,
      }),
      point({ month: "2023-05", restschuld: 36500000 }),
    ];

    expect(paydownBridgeSpan(points)).toEqual({
      from: "2023-01",
      to: "2023-04",
      paidOff: 3000000,
    });
  });

  it("ends at the join month, so paidOff is the Original Principal minus the Restschuld there", () => {
    const points = [
      point({ month: "2025-11", restschuldBridge: 20000000 }),
      point({
        month: "2025-12",
        restschuld: 19800000,
        restschuldBridge: 19800000,
      }),
      point({ month: "2026-01", restschuld: 19600000 }),
    ];

    const span = paydownBridgeSpan(points);

    expect(span?.to).toBe("2025-12");
    expect(span?.paidOff).toBe(20000000 - 19800000);
  });
});
