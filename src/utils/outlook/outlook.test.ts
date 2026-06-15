import { describe, it, expect } from "vitest";
import { deriveOutlookSummary, type OutlookPoint } from "./outlook";

const p = (
  month: string,
  totalLiquid: number,
  restschuld: number
): OutlookPoint => ({ month, totalLiquid, restschuld });

describe("deriveOutlookSummary", () => {
  it("reports the final point's Total Liquid and year", () => {
    const points = [
      p("2026-01", 100000, 900000),
      p("2026-02", 120000, 900000),
      p("2028-12", 500000, 0),
    ];

    const s = deriveOutlookSummary(points);

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

    expect(deriveOutlookSummary(points).debtFreeMonth).toBe("2027-10");
  });

  it("returns a null debt-free month when the mortgage never pays off", () => {
    const points = [p("2026-01", 0, 900000), p("2027-01", 0, 850000)];
    expect(deriveOutlookSummary(points).debtFreeMonth).toBeNull();
  });

  it("returns a null debt-free month when there is no debt at all", () => {
    const points = [p("2026-01", 0, 0), p("2027-01", 0, 0)];
    expect(deriveOutlookSummary(points).debtFreeMonth).toBeNull();
  });

  it("sums each Restschuld step-down as a Sondertilgung payment and counts them", () => {
    // Two paydowns: 900000→720000 (180000) and 720000→0 (720000).
    const points = [
      p("2026-01", 0, 900000),
      p("2026-10", 0, 720000),
      p("2027-05", 0, 720000),
      p("2027-10", 0, 0),
    ];

    const s = deriveOutlookSummary(points);

    expect(s.totalSondertilgung).toBe(900000);
    expect(s.sondertilgungCount).toBe(2);
  });

  it("ignores months where the Restschuld does not decrease", () => {
    const points = [
      p("2026-01", 0, 500000),
      p("2026-02", 0, 500000),
      p("2026-03", 0, 400000),
    ];

    const s = deriveOutlookSummary(points);

    expect(s.totalSondertilgung).toBe(100000);
    expect(s.sondertilgungCount).toBe(1);
  });

  it("handles an empty projection without throwing", () => {
    const s = deriveOutlookSummary([]);
    expect(s.finalTotalLiquid).toBe(0);
    expect(s.totalSondertilgung).toBe(0);
    expect(s.sondertilgungCount).toBe(0);
    expect(s.debtFreeMonth).toBeNull();
  });
});
