import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { monthEndBalance } from "./monthEndBalance";
import { monthEndBalance as fromBarrel } from "../index";
import { buildPastLeadIn, buildTrajectoryData } from "../projection/projection";
import type { MonthlySnapshot } from "../../types/projection";
import type { HistoryPoint } from "../../types/history";
import type { AccountWithBalance } from "../../types/account";

// Today is October 2026. History is reconstructed from 2026-06 (Main is known
// from 2026-07) through the current month; the projection starts at the
// current month and reaches 2026-12.
const CURRENT = "2026-10";

const giro: AccountWithBalance = {
  id: "main",
  kind: "Girokonto",
  name: "Main",
  anchorBalance: 500000,
  anchorDate: "2026-07-15",
  balance: 500000,
};

function point(month: string, main: number | null): HistoryPoint {
  return {
    month,
    totalLiquid: main,
    restschuld: 0,
    netCashflow: 0,
    accounts: { main },
  };
}

function snapshot(month: string, main: number): MonthlySnapshot {
  return {
    month,
    accounts: { main: { projected: main } },
    netCashflow: 0,
    totalLiquid: main,
  };
}

const points: HistoryPoint[] = [
  point("2026-06", null),
  point("2026-07", 480000),
  point("2026-08", 495000),
  point("2026-09", 512345),
  point("2026-10", 530000),
];

const snapshots: MonthlySnapshot[] = [
  snapshot("2026-10", 531000),
  snapshot("2026-11", 552000),
  snapshot("2026-12", 573000),
];

describe("monthEndBalance — Actual and Projected", () => {
  it("reads a past month's History point as Actual", () => {
    expect(
      monthEndBalance("2026-09", CURRENT, snapshots, points, "main")
    ).toEqual({ basis: "actual", cents: 512345 });
  });

  it("reads the current month from the projection, as Projected", () => {
    expect(
      monthEndBalance("2026-10", CURRENT, snapshots, points, "main")
    ).toEqual({ basis: "projected", cents: 531000 });
  });

  it("reads a future month from the projection, as Projected", () => {
    expect(
      monthEndBalance("2026-12", CURRENT, snapshots, points, "main")
    ).toEqual({ basis: "projected", cents: 573000 });
  });

  it("keeps a real zero balance as a figure, not Unknown", () => {
    const zero = [point("2026-09", 0)];

    expect(
      monthEndBalance("2026-09", CURRENT, snapshots, zero, "main")
    ).toEqual({ basis: "actual", cents: 0 });
  });
});

describe("monthEndBalance — Unknown, never €0", () => {
  it("is Unknown for a null History point, naming the first known month", () => {
    const result = monthEndBalance(
      "2026-06",
      CURRENT,
      snapshots,
      points,
      "main"
    );

    expect(result).toEqual({ basis: "unknown", knownFrom: "2026-07" });
    expect(result).not.toHaveProperty("cents");
  });

  it("is Unknown for a month before the History Span", () => {
    const result = monthEndBalance(
      "2025-12",
      CURRENT,
      snapshots,
      points,
      "main"
    );

    expect(result).toEqual({ basis: "unknown", knownFrom: "2026-07" });
    expect(result).not.toHaveProperty("cents");
  });

  it("is Unknown for a month past the projection horizon", () => {
    const result = monthEndBalance(
      "2027-01",
      CURRENT,
      snapshots,
      points,
      "main"
    );

    expect(result.basis).toBe("unknown");
    expect(result).not.toHaveProperty("cents");
  });

  it("is Unknown for an account neither source carries", () => {
    const result = monthEndBalance(
      "2026-11",
      CURRENT,
      snapshots,
      points,
      "ghost"
    );

    expect(result.basis).toBe("unknown");
    expect(result).not.toHaveProperty("cents");
  });

  it("does not read the projection for a past month", () => {
    // A past month the History does not cover stays Unknown even when a
    // snapshot happens to carry that month.
    const result = monthEndBalance(
      "2026-09",
      CURRENT,
      [snapshot("2026-09", 999999), ...snapshots],
      [],
      "main"
    );

    expect(result.basis).toBe("unknown");
  });

  it("does not read History for the current month", () => {
    // The current month comes only from the projection — the Past Lead-in's
    // join rule — so a History point for it is not consulted.
    const result = monthEndBalance("2026-10", CURRENT, [], points, "main");

    expect(result.basis).toBe("unknown");
  });
});

describe("monthEndBalance — one figure across surfaces", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-16T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("equals the Trajectory Horizon's and Outlook's projected value for a future month", () => {
    const rows = buildTrajectoryData(snapshots, new Map(), null, [giro]);
    const november = rows.find((r) => r.label === "2026-11");

    expect(
      monthEndBalance("2026-11", CURRENT, snapshots, points, "main")
    ).toEqual({ basis: "projected", cents: november?.main });
    expect(november?.main).toBe(
      snapshots.find((s) => s.month === "2026-11")?.accounts.main.projected
    );
  });

  it("equals the Trajectory Horizon's projected value for the current month", () => {
    const rows = buildTrajectoryData(snapshots, new Map(), null, [giro]);
    const october = rows.find((r) => r.label === "2026-10");

    expect(
      monthEndBalance("2026-10", CURRENT, snapshots, points, "main")
    ).toEqual({ basis: "projected", cents: october?.main });
  });

  it("equals the Past Lead-in's and History's value for a past month", () => {
    const leadIn = buildPastLeadIn(points, [giro]);
    const august = leadIn.find((r) => r.label === "2026-08");

    expect(
      monthEndBalance("2026-08", CURRENT, snapshots, points, "main")
    ).toEqual({ basis: "actual", cents: august?.main });
    expect(august?.main).toBe(
      points.find((p) => p.month === "2026-08")?.accounts.main
    );
  });
});

describe("monthEndBalance — utils barrel", () => {
  it("is exported from the utils barrel", () => {
    expect(fromBarrel).toBe(monthEndBalance);
  });
});
