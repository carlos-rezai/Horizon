import { describe, it, expect } from "vitest";
import { deriveKpiStrip } from "./kpi";
import type { KpiPoint } from "./kpi";

/**
 * Build a projection of `count` months where each metric follows a simple
 * linear ramp from its start value. Index 0 is the current month.
 */
const ramp = (
  count: number,
  start: {
    totalLiquid: number;
    restschuld: number | null;
    netCashflow: number;
  },
  step: { totalLiquid: number; restschuld: number; netCashflow: number }
): KpiPoint[] =>
  Array.from({ length: count }, (_, i) => ({
    totalLiquid: start.totalLiquid + step.totalLiquid * i,
    restschuld:
      start.restschuld === null ? null : start.restschuld + step.restschuld * i,
    netCashflow: start.netCashflow + step.netCashflow * i,
  }));

describe("deriveKpiStrip — Total Liquid", () => {
  it("uses the current month's value as the headline figure", () => {
    const points = ramp(
      13,
      { totalLiquid: 1_000_000, restschuld: 0, netCashflow: 0 },
      { totalLiquid: 10_000, restschuld: 0, netCashflow: 0 }
    );

    expect(deriveKpiStrip(points).totalLiquid.value).toBe(1_000_000);
  });

  it("slices a 12-month sparkline window from the projection", () => {
    const points = ramp(
      20,
      { totalLiquid: 1_000_000, restschuld: 0, netCashflow: 0 },
      { totalLiquid: 10_000, restschuld: 0, netCashflow: 0 }
    );

    const { spark } = deriveKpiStrip(points).totalLiquid;

    expect(spark).toHaveLength(12);
    expect(spark[0]).toBe(1_000_000); // index 0
    expect(spark[11]).toBe(1_110_000); // index 11
  });

  it("computes the delta as the percent change across the 12-month window (first → last)", () => {
    // 1,000,000 → 1,068,000 over the window = +6.8%
    const points: KpiPoint[] = [
      ...ramp(
        11,
        { totalLiquid: 1_000_000, restschuld: 0, netCashflow: 0 },
        { totalLiquid: 0, restschuld: 0, netCashflow: 0 }
      ).slice(0, 11),
      { totalLiquid: 1_068_000, restschuld: 0, netCashflow: 0 },
    ];

    expect(deriveKpiStrip(points).totalLiquid.delta).toBeCloseTo(6.8, 5);
  });

  it("ignores months beyond the 12-month window when computing the delta", () => {
    const points = ramp(
      24,
      { totalLiquid: 1_000_000, restschuld: 0, netCashflow: 0 },
      { totalLiquid: 10_000, restschuld: 0, netCashflow: 0 }
    );

    // window is index 0 (1,000,000) → index 11 (1,110,000) = +11%, not the
    // value at month 23.
    expect(deriveKpiStrip(points).totalLiquid.delta).toBeCloseTo(11, 5);
  });
});

describe("deriveKpiStrip — Restschuld", () => {
  it("uses the current month's restschuld as the headline figure", () => {
    const points = ramp(
      13,
      { totalLiquid: 0, restschuld: 300_000, netCashflow: 0 },
      { totalLiquid: 0, restschuld: -5_000, netCashflow: 0 }
    );

    expect(deriveKpiStrip(points).restschuld.value).toBe(300_000);
  });

  it("reports a negative delta when debt falls across the window", () => {
    // 300,000 → 250,000 across the window = -16.666...%
    const points: KpiPoint[] = [
      { totalLiquid: 0, restschuld: 300_000, netCashflow: 0 },
      ...Array.from({ length: 10 }, () => ({
        totalLiquid: 0,
        restschuld: 275_000,
        netCashflow: 0,
      })),
      { totalLiquid: 0, restschuld: 250_000, netCashflow: 0 },
    ];

    expect(deriveKpiStrip(points).restschuld.delta).toBeCloseTo(-16.6667, 3);
  });

  it("coerces post-payoff null restschuld entries to zero in the sparkline", () => {
    const points: KpiPoint[] = [
      { totalLiquid: 0, restschuld: 100_000, netCashflow: 0 },
      { totalLiquid: 0, restschuld: 50_000, netCashflow: 0 },
      { totalLiquid: 0, restschuld: null, netCashflow: 0 },
      { totalLiquid: 0, restschuld: null, netCashflow: 0 },
    ];

    const { spark } = deriveKpiStrip(points).restschuld;

    expect(spark).toEqual([100_000, 50_000, 0, 0]);
  });

  it("reports a zero value when the mortgage is already paid off at the current month", () => {
    const points: KpiPoint[] = [
      { totalLiquid: 0, restschuld: null, netCashflow: 0 },
      { totalLiquid: 0, restschuld: null, netCashflow: 0 },
    ];

    expect(deriveKpiStrip(points).restschuld.value).toBe(0);
  });
});

describe("deriveKpiStrip — Net Cashflow", () => {
  it("uses the current month's real value, not a forward-projected number", () => {
    const points = ramp(
      13,
      { totalLiquid: 0, restschuld: 0, netCashflow: 145_000 },
      { totalLiquid: 0, restschuld: 0, netCashflow: 10_000 }
    );

    expect(deriveKpiStrip(points).netCashflow.value).toBe(145_000);
  });

  it("still produces a 12-month sparkline", () => {
    const points = ramp(
      15,
      { totalLiquid: 0, restschuld: 0, netCashflow: 100_000 },
      { totalLiquid: 0, restschuld: 0, netCashflow: 1_000 }
    );

    expect(deriveKpiStrip(points).netCashflow.spark).toHaveLength(12);
  });

  it("never reports a forward delta (value-only KPI)", () => {
    const points = ramp(
      13,
      { totalLiquid: 0, restschuld: 0, netCashflow: 100_000 },
      { totalLiquid: 0, restschuld: 0, netCashflow: 50_000 }
    );

    expect(deriveKpiStrip(points).netCashflow.delta).toBeNull();
  });
});

describe("deriveKpiStrip — To Payoff", () => {
  it("reports months-to-payoff and the debt-free month when the mortgage pays off in horizon", () => {
    const points: KpiPoint[] = [
      { month: "2026-04", totalLiquid: 0, restschuld: 300_000, netCashflow: 0 },
      { month: "2026-05", totalLiquid: 0, restschuld: 225_000, netCashflow: 0 },
      { month: "2026-06", totalLiquid: 0, restschuld: 150_000, netCashflow: 0 },
      { month: "2026-07", totalLiquid: 0, restschuld: 75_000, netCashflow: 0 },
      { month: "2026-08", totalLiquid: 0, restschuld: 0, netCashflow: 0 },
    ];

    const { toPayoff } = deriveKpiStrip(points);

    expect(toPayoff).not.toBeNull();
    expect(toPayoff?.months).toBe(4); // index 0 is the current month
    expect(toPayoff?.payoffMonth).toBe("2026-08");
  });

  it("detects payoff via a post-payoff null restschuld entry", () => {
    const points: KpiPoint[] = [
      { month: "2026-04", totalLiquid: 0, restschuld: 100_000, netCashflow: 0 },
      { month: "2026-05", totalLiquid: 0, restschuld: 50_000, netCashflow: 0 },
      { month: "2026-06", totalLiquid: 0, restschuld: null, netCashflow: 0 },
    ];

    const { toPayoff } = deriveKpiStrip(points);

    expect(toPayoff?.months).toBe(2);
    expect(toPayoff?.payoffMonth).toBe("2026-06");
  });

  it("returns null when there is no mortgage (restschuld null throughout)", () => {
    const points: KpiPoint[] = [
      { month: "2026-04", totalLiquid: 0, restschuld: null, netCashflow: 0 },
      { month: "2026-05", totalLiquid: 0, restschuld: null, netCashflow: 0 },
    ];

    expect(deriveKpiStrip(points).toPayoff).toBeNull();
  });

  it("returns null when the mortgage never pays off within the horizon", () => {
    const points: KpiPoint[] = [
      { month: "2026-04", totalLiquid: 0, restschuld: 300_000, netCashflow: 0 },
      { month: "2026-05", totalLiquid: 0, restschuld: 295_000, netCashflow: 0 },
    ];

    expect(deriveKpiStrip(points).toPayoff).toBeNull();
  });

  it("returns null when the mortgage is already paid off at the current month", () => {
    const points: KpiPoint[] = [
      { month: "2026-04", totalLiquid: 0, restschuld: 0, netCashflow: 0 },
    ];

    expect(deriveKpiStrip(points).toPayoff).toBeNull();
  });
});

describe("deriveKpiStrip — edge cases", () => {
  it("returns zero values, null deltas, and empty sparklines for an empty projection", () => {
    const result = deriveKpiStrip([]);

    for (const kpi of [
      result.totalLiquid,
      result.restschuld,
      result.netCashflow,
    ]) {
      expect(kpi.value).toBe(0);
      expect(kpi.delta).toBeNull();
      expect(kpi.spark).toEqual([]);
    }
  });

  it("returns a null delta when only the current month exists (no change to measure)", () => {
    const points: KpiPoint[] = [
      { totalLiquid: 1_000_000, restschuld: 300_000, netCashflow: 145_000 },
    ];

    const result = deriveKpiStrip(points);

    expect(result.totalLiquid.delta).toBeNull();
    expect(result.restschuld.delta).toBeNull();
    expect(result.totalLiquid.value).toBe(1_000_000);
    expect(result.totalLiquid.spark).toEqual([1_000_000]);
  });

  it("returns a null delta when the starting value is zero (divide-by-zero guard)", () => {
    const points = ramp(
      13,
      { totalLiquid: 0, restschuld: 0, netCashflow: 0 },
      { totalLiquid: 10_000, restschuld: 0, netCashflow: 0 }
    );

    expect(deriveKpiStrip(points).totalLiquid.delta).toBeNull();
  });

  it("computes the delta across the available window for a short (<12-month) projection", () => {
    // 5 months: 1,000,000 → 1,040,000 = +4%
    const points = ramp(
      5,
      { totalLiquid: 1_000_000, restschuld: 0, netCashflow: 0 },
      { totalLiquid: 10_000, restschuld: 0, netCashflow: 0 }
    );

    const { spark, delta } = deriveKpiStrip(points).totalLiquid;

    expect(spark).toHaveLength(5);
    expect(delta).toBeCloseTo(4, 5);
  });
});
