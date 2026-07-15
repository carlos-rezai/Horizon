import { describe, it, expect } from "vitest";
import { computeSavingsGoal, milestoneSplit } from "./savingsGoal";
import type { SavingsGoalConfig } from "../../features/savings/savingsTypes";
import type { HistoryPoint } from "../../features/history/historyTypes";

// ---------------------------------------------------------------------------
// computeSavingsGoal(config, points, trackableIds) — pure port of the
// prototype's streak/calendar/weighting logic. No I/O, deterministic on its
// inputs: "today" and the calendar-strip year are derived from the LAST
// history point (never `new Date()`). All monetary values are integer cents.
//
// Milestone trailing-12-month weighting is exercised in Phase 4; this suite
// covers the Phase-1 acceptance criteria: streak counting, the met/AND rules,
// strip classification, no-tracked-accounts, manual targets, per-account
// cumulative-since-startedAt, and the empty-history zeroed goal.
// ---------------------------------------------------------------------------

/** Build a HistoryPoint from a month string and a per-account balance map. */
function pt(month: string, accounts: Record<string, number>): HistoryPoint {
  const totalLiquid = Object.values(accounts).reduce((sum, v) => sum + v, 0);
  return { month, totalLiquid, restschuld: 0, netCashflow: 0, accounts };
}

/** A manual-mode config with the given per-account monthly targets (cents). */
function manualConfig(
  manualMonthly: Record<string, number>,
  overrides: Partial<SavingsGoalConfig> = {}
): SavingsGoalConfig {
  return {
    mode: "manual",
    targetTotal: 0,
    targetDate: "2026-12",
    startedAt: "2026-01",
    manualMonthly,
    ...overrides,
  };
}

/** A milestone-mode config with the given total (cents) and target month. */
function milestoneConfig(
  targetTotal: number,
  overrides: Partial<SavingsGoalConfig> = {}
): SavingsGoalConfig {
  return {
    mode: "milestone",
    targetTotal,
    targetDate: "2027-04",
    startedAt: "2026-01",
    manualMonthly: {},
    ...overrides,
  };
}

describe("computeSavingsGoal — current & best streak", () => {
  // One tracked account, target €100/mo. A four-month met run (Feb–May), one
  // missed month (Jun, +€20), then a two-month met run (Jul–Aug).
  const config = manualConfig({ a1: 10000 });
  const trackableIds = ["a1"];
  const points: HistoryPoint[] = [
    pt("2026-01", { a1: 0 }),
    pt("2026-02", { a1: 10000 }), // +10000 met
    pt("2026-03", { a1: 20000 }), // +10000 met
    pt("2026-04", { a1: 30000 }), // +10000 met
    pt("2026-05", { a1: 40000 }), // +10000 met
    pt("2026-06", { a1: 42000 }), // +2000  MISSED
    pt("2026-07", { a1: 52000 }), // +10000 met
    pt("2026-08", { a1: 62000 }), // +10000 met
  ];

  it("counts the current streak as the consecutive most-recent met months", () => {
    const goal = computeSavingsGoal(config, points, trackableIds);
    // Jul + Aug met, Jun missed → current run of 2.
    expect(goal.streak.current).toBe(2);
  });

  it("reports the best streak as the longest met run anywhere in history", () => {
    const goal = computeSavingsGoal(config, points, trackableIds);
    // Feb–May is a run of 4; that is the record even though the current run is 2.
    expect(goal.streak.best).toBe(4);
  });
});

describe("computeSavingsGoal — the met rule and streak reset", () => {
  it("counts a month as met when the balance gain is at least the target", () => {
    const config = manualConfig({ a1: 10000 });
    const points: HistoryPoint[] = [
      pt("2026-01", { a1: 0 }),
      pt("2026-02", { a1: 10000 }), // exactly the target → met
    ];
    const goal = computeSavingsGoal(config, points, ["a1"]);
    expect(goal.streak.current).toBe(1);
  });

  it("resets the current streak to zero when the most recent month is missed", () => {
    const config = manualConfig({ a1: 10000 });
    const points: HistoryPoint[] = [
      pt("2026-01", { a1: 0 }),
      pt("2026-02", { a1: 10000 }), // met
      pt("2026-03", { a1: 20000 }), // met
      pt("2026-04", { a1: 21000 }), // +1000 MISSED (most recent)
    ];
    const goal = computeSavingsGoal(config, points, ["a1"]);
    expect(goal.streak.current).toBe(0);
    expect(goal.streak.best).toBe(2);
  });
});

describe("computeSavingsGoal — the AND rule across tracked accounts", () => {
  it("counts a month only when every tracked account meets its target", () => {
    const config = manualConfig({ a1: 10000, a2: 10000 });
    const points: HistoryPoint[] = [
      pt("2026-01", { a1: 0, a2: 0 }),
      pt("2026-02", { a1: 10000, a2: 10000 }), // both met → met
      pt("2026-03", { a1: 20000, a2: 15000 }), // a1 met, a2 +5000 short → MISSED
    ];
    const goal = computeSavingsGoal(config, points, ["a1", "a2"]);
    // March fails the AND rule, so the current streak is broken.
    expect(goal.streak.current).toBe(0);
    expect(goal.streak.best).toBe(1);
  });
});

describe("computeSavingsGoal — no tracked accounts", () => {
  it("yields a zero streak when no account has a positive target", () => {
    // Trackable account with no target (manualMonthly empty) → Not Tracked.
    const config = manualConfig({});
    const points: HistoryPoint[] = [
      pt("2026-01", { a1: 0 }),
      pt("2026-02", { a1: 99999 }), // grows, but a1 is not tracked
    ];
    const goal = computeSavingsGoal(config, points, ["a1"]);
    expect(goal.streak.current).toBe(0);
    expect(goal.streak.best).toBe(0);
    expect(goal.perAccount[0].tracked).toBe(false);
    expect(goal.perAccount[0].target).toBe(0);
  });
});

describe("computeSavingsGoal — calendar strip classification", () => {
  const config = manualConfig({ a1: 10000 });
  const points: HistoryPoint[] = [
    pt("2026-01", { a1: 0 }),
    pt("2026-02", { a1: 10000 }), // met
    pt("2026-03", { a1: 20000 }), // met
    pt("2026-04", { a1: 30000 }), // met
    pt("2026-05", { a1: 40000 }), // met
    pt("2026-06", { a1: 42000 }), // MISSED
    pt("2026-07", { a1: 52000 }), // met
    pt("2026-08", { a1: 62000 }), // met
  ];

  it("returns twelve Jan→Dec ticks for the last point's year, 0-based months", () => {
    const goal = computeSavingsGoal(config, points, ["a1"]);
    expect(goal.streak.yearTicks).toHaveLength(12);
    expect(goal.streak.yearTicks[0]).toMatchObject({ year: 2026, month: 0 });
    expect(goal.streak.yearTicks[11]).toMatchObject({ year: 2026, month: 11 });
  });

  it("marks the baseline month upcoming, resolved months met/missed, and future months upcoming", () => {
    const goal = computeSavingsGoal(config, points, ["a1"]);
    const ticks = goal.streak.yearTicks;
    // Jan is the first history point — no prior month to compare → upcoming.
    expect(ticks[0].status).toBe("upcoming");
    // Feb resolved and met.
    expect(ticks[1].status).toBe("met");
    // Jun resolved and missed.
    expect(ticks[5].status).toBe("missed");
    // Sep has no history behind it → upcoming.
    expect(ticks[8].status).toBe("upcoming");
  });
});

describe("computeSavingsGoal — manual-mode targets", () => {
  it("exposes each trackable account's monthly target from manualMonthly", () => {
    const config = manualConfig({ a1: 10000, a2: 25000 });
    const points: HistoryPoint[] = [pt("2026-01", { a1: 0, a2: 0 })];
    const goal = computeSavingsGoal(config, points, ["a1", "a2"]);
    expect(goal.monthly).toEqual({ a1: 10000, a2: 25000 });
    expect(goal.monthsToTarget).toBeNull();
  });
});

describe("computeSavingsGoal — per-account cumulative since startedAt", () => {
  it("measures cumulative actual and target from the goal's start month", () => {
    const config = manualConfig({ a1: 10000 }, { startedAt: "2026-01" });
    const points: HistoryPoint[] = [
      pt("2026-01", { a1: 0 }),
      pt("2026-02", { a1: 10000 }),
      pt("2026-03", { a1: 20000 }),
      pt("2026-04", { a1: 30000 }),
    ];
    const goal = computeSavingsGoal(config, points, ["a1"]);
    expect(goal.monthsElapsed).toBe(3);
    const row = goal.perAccount[0];
    expect(row.cumulativeActual).toBe(30000); // 30000 − 0 since Jan
    expect(row.cumulativeTarget).toBe(30000); // 10000 × 3 months
  });
});

describe("computeSavingsGoal — milestone weighting", () => {
  // Four months → three deltas. a1 and a2 each gain €100/mo; a3 gains €200/mo.
  // Trailing-12 average positive gains: a1=10000, a2=10000, a3=20000 → weights
  // 10000 : 10000 : 20000 (sum 40000). "Today" is the last point (2026-04);
  // the target is exactly 12 months out (2027-04) → monthsToTarget = 12.
  const points: HistoryPoint[] = [
    pt("2026-01", { a1: 0, a2: 0, a3: 0 }),
    pt("2026-02", { a1: 10000, a2: 10000, a3: 20000 }),
    pt("2026-03", { a1: 20000, a2: 20000, a3: 40000 }),
    pt("2026-04", { a1: 30000, a2: 30000, a3: 60000 }),
  ];
  const ids = ["a1", "a2", "a3"];

  it("splits the required monthly amount by each account's trailing average gain", () => {
    // requiredMonthly = 480000 / 12 = 40000; distributed 1:1:2 by weight.
    const goal = computeSavingsGoal(milestoneConfig(480000), points, ids);
    expect(goal.monthly).toEqual({ a1: 10000, a2: 10000, a3: 20000 });
    expect(goal.monthsToTarget).toBe(12);
  });

  it("floors an account with no positive gains to a small share rather than zero", () => {
    // a1 gains €200/mo (avg 20000); a2 is flat, so its average is 0 and the
    // Math.max(avg, 100) floor gives it weight 100. Weights 20000 : 100
    // (sum 20100); requiredMonthly = 241200 / 12 = 20100.
    const floorPoints: HistoryPoint[] = [
      pt("2026-01", { a1: 0, a2: 5000 }),
      pt("2026-02", { a1: 20000, a2: 5000 }),
      pt("2026-03", { a1: 40000, a2: 5000 }),
      pt("2026-04", { a1: 60000, a2: 5000 }),
    ];
    const goal = computeSavingsGoal(milestoneConfig(241200), floorPoints, [
      "a1",
      "a2",
    ]);
    expect(goal.monthly.a1).toBe(20000);
    // Floored to a positive share (100/20100 of 20100) — never dropped to zero.
    expect(goal.monthly.a2).toBe(100);
  });
});

describe("milestoneSplit — the exported Milestone auto-split", () => {
  // Same four-point history as the milestone-weighting suite: a1/a2 gain
  // €100/mo, a3 gains €200/mo → trailing-average weights 10000:10000:20000
  // (sum 40000). "Today" is the last point (2026-04); the target (2027-04) is
  // exactly 12 months out → requiredMonthly = 480000 / 12 = 40000.
  const points: HistoryPoint[] = [
    pt("2026-01", { a1: 0, a2: 0, a3: 0 }),
    pt("2026-02", { a1: 10000, a2: 10000, a3: 20000 }),
    pt("2026-03", { a1: 20000, a2: 20000, a3: 40000 }),
    pt("2026-04", { a1: 30000, a2: 30000, a3: 60000 }),
  ];
  const ids = ["a1", "a2", "a3"];

  it("splits the required monthly amount by each account's trailing average gain", () => {
    expect(milestoneSplit(480000, "2027-04", points, ids)).toEqual({
      a1: 10000,
      a2: 10000,
      a3: 20000,
    });
  });

  it("floors an account with no positive gains to a small share rather than zero", () => {
    const floorPoints: HistoryPoint[] = [
      pt("2026-01", { a1: 0, a2: 5000 }),
      pt("2026-02", { a1: 20000, a2: 5000 }),
      pt("2026-03", { a1: 40000, a2: 5000 }),
      pt("2026-04", { a1: 60000, a2: 5000 }),
    ];
    const split = milestoneSplit(241200, "2027-04", floorPoints, ["a1", "a2"]);
    expect(split.a1).toBe(20000);
    expect(split.a2).toBe(100);
  });

  it("yields an all-zero map when there is no history to measure from", () => {
    expect(milestoneSplit(480000, "2027-04", [], ids)).toEqual({
      a1: 0,
      a2: 0,
      a3: 0,
    });
  });
});

describe("computeSavingsGoal — startedAt against the history range", () => {
  const points: HistoryPoint[] = [
    pt("2026-01", { a1: 0 }),
    pt("2026-02", { a1: 10000 }),
    pt("2026-03", { a1: 20000 }),
    pt("2026-04", { a1: 30000 }),
  ];

  it("measures months elapsed from a startedAt within the history range", () => {
    const goal = computeSavingsGoal(
      milestoneConfig(120000, { startedAt: "2026-02" }),
      points,
      ["a1"]
    );
    // Feb (idx 1) → Apr (idx 3) is two elapsed months.
    expect(goal.monthsElapsed).toBe(2);
  });

  it("yields zero elapsed and zero cumulative when startedAt precedes all history", () => {
    const goal = computeSavingsGoal(
      milestoneConfig(120000, { startedAt: "2025-06" }),
      points,
      ["a1"]
    );
    expect(goal.monthsElapsed).toBe(0);
    expect(goal.perAccount[0].cumulativeActual).toBe(0);
    expect(goal.perAccount[0].cumulativeTarget).toBe(0);
  });

  it("yields zero elapsed and zero cumulative when startedAt is after all history", () => {
    const goal = computeSavingsGoal(
      milestoneConfig(120000, { startedAt: "2026-09" }),
      points,
      ["a1"]
    );
    expect(goal.monthsElapsed).toBe(0);
    expect(goal.perAccount[0].cumulativeActual).toBe(0);
    expect(goal.perAccount[0].cumulativeTarget).toBe(0);
  });
});

describe("computeSavingsGoal — empty history", () => {
  it("produces a zeroed goal without throwing when there are no points", () => {
    const config = manualConfig({});
    expect(() => computeSavingsGoal(config, [], ["a1"])).not.toThrow();
    const goal = computeSavingsGoal(config, [], ["a1"]);
    expect(goal.streak.current).toBe(0);
    expect(goal.streak.best).toBe(0);
    expect(goal.streak.yearTicks).toEqual([]);
    expect(goal.perAccount[0].cumulativeActual).toBe(0);
    expect(goal.perAccount[0].cumulativeTarget).toBe(0);
  });
});
