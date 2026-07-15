import type { HistoryPoint } from "../../features/history/historyTypes";
import type {
  PerAccountGoal,
  SavingsGoal,
  SavingsGoalConfig,
  StreakSummary,
  YearTick,
} from "../../features/savings/savingsTypes";

// ---------------------------------------------------------------------------
// computeSavingsGoal — a pure port of the prototype's savings-goal logic
// (docs/handoff/savings-streak/prototype/src/data.js). The arithmetic is
// unchanged; two implicit prototype edges are made explicit here:
//   • balances are read from `point.accounts[id]` (not `point[id]`), and
//   • months are "YYYY-MM" strings (not `{ year, month }` objects).
// "Today" and the calendar-strip year are derived from the LAST history point,
// never `new Date()`, so the function is deterministic on its inputs. Empty
// history yields a zeroed goal (streak 0, no ticks) rather than throwing.
//
// The body is a thin orchestrator over small single-purpose helpers below:
// resolve monthly targets → derive per-account progress → scan monthly-met →
// count the streaks → build the Jan→Dec strip. All helpers are private and
// tested through the public function, except the Milestone split, which has a
// second consumer (the goal editor's live preview) and is exported.
// ---------------------------------------------------------------------------

interface YearMonth {
  year: number;
  month: number;
}

/** Parse "YYYY-MM" into a 0-based { year, month }. */
function parseMonth(ym: string): YearMonth {
  const [year, month] = ym.split("-").map(Number);
  return { year, month: month - 1 };
}

/** Whole months from `from` to `to` — may be negative. */
function monthsBetween(from: YearMonth, to: YearMonth): number {
  return (to.year - from.year) * 12 + (to.month - from.month);
}

/** The last history point's month, or null when there is no history. */
function lastMonth(points: HistoryPoint[]): YearMonth | null {
  return points.length > 0 ? parseMonth(points[points.length - 1].month) : null;
}

/** A point's balance for an account, treating a missing account as 0. */
function balanceOf(point: HistoryPoint, id: string): number {
  return point.accounts[id] ?? 0;
}

/**
 * Months from "today" (the last history point) to the Milestone target month,
 * floored at 1. Null when there is no history to measure from — only meaningful
 * in Milestone mode.
 */
function monthsToTargetFrom(
  points: HistoryPoint[],
  targetDate: string
): number | null {
  const todayPt = lastMonth(points);
  if (!todayPt) return null;
  return Math.max(1, monthsBetween(todayPt, parseMonth(targetDate)));
}

/**
 * The Milestone auto-split. Distributes the required monthly saving
 * (`targetTotal ÷ months remaining to the target month`) across the trackable
 * accounts, weighted by each account's own demonstrated average monthly gain
 * (trailing 12 months, positive contributions only) and floored so no account
 * is ever dropped to zero. Returns a per-account cents map. Empty history — no
 * "today" to measure from — yields an all-zero map.
 */
function milestoneSplit(
  targetTotal: number,
  targetDate: string,
  points: HistoryPoint[],
  ids: string[]
): Record<string, number> {
  const monthly: Record<string, number> = {};
  const monthsToTarget = monthsToTargetFrom(points, targetDate);
  if (!monthsToTarget) {
    for (const id of ids) monthly[id] = 0;
    return monthly;
  }

  // Weight by each account's own demonstrated average monthly gain (trailing
  // 12 months, positive contributions only) — not raw balance.
  const trailing = 12;
  const weights: Record<string, number> = {};
  let wSum = 0;
  for (const id of ids) {
    let sum = 0;
    let n = 0;
    for (
      let i = Math.max(1, points.length - trailing);
      i < points.length;
      i++
    ) {
      const delta = balanceOf(points[i], id) - balanceOf(points[i - 1], id);
      if (delta > 0) {
        sum += delta;
        n += 1;
      }
    }
    const avg = n > 0 ? sum / n : 0;
    weights[id] = Math.max(avg, 100);
    wSum += weights[id];
  }

  const requiredMonthly = targetTotal / monthsToTarget;
  for (const id of ids) {
    monthly[id] =
      wSum > 0 ? Math.round(requiredMonthly * (weights[id] / wSum)) : 0;
  }
  return monthly;
}

/** Manual mode: pass the saved per-account targets through (missing → 0). */
function manualTargets(
  config: SavingsGoalConfig,
  ids: string[]
): Record<string, number> {
  const monthly: Record<string, number> = {};
  for (const id of ids) {
    monthly[id] = config.manualMonthly?.[id] ?? 0;
  }
  return monthly;
}

/** Index of the history point whose month equals `startedAt`, or -1. */
function findStartIndex(points: HistoryPoint[], startedAt: string): number {
  const start = parseMonth(startedAt);
  return points.findIndex((p) => {
    const pm = parseMonth(p.month);
    return pm.year === start.year && pm.month === start.month;
  });
}

/**
 * Per-account cumulative progress since the goal's start month. `cumulativeActual`
 * is the balance gained since `startedAt`; `cumulativeTarget` is the monthly
 * target × months elapsed. Untracked accounts (no positive target) read zero.
 */
function derivePerAccount(
  points: HistoryPoint[],
  ids: string[],
  monthly: Record<string, number>,
  startIdx: number,
  todayIdx: number,
  monthsElapsed: number
): PerAccountGoal[] {
  return ids.map((id) => {
    const accountTarget = monthly[id] || 0;
    const tracked = accountTarget > 0;
    const cumulativeActual =
      tracked && startIdx >= 0 && todayIdx >= 0
        ? balanceOf(points[todayIdx], id) - balanceOf(points[startIdx], id)
        : 0;
    const cumulativeTarget = tracked ? accountTarget * monthsElapsed : 0;
    return {
      id,
      target: accountTarget,
      tracked,
      cumulativeActual,
      cumulativeTarget,
    };
  });
}

/** One resolved month-transition and whether every tracked account met target. */
interface MonthMet {
  year: number;
  month: number;
  onTrack: boolean;
}

/**
 * For each month with a prior month to compare against, whether every tracked
 * account's balance gain met its monthly target (the AND rule). A month with no
 * tracked accounts is never on track. Oldest → newest.
 */
function scanMonthlyMet(
  points: HistoryPoint[],
  trackedIds: string[],
  monthly: Record<string, number>
): MonthMet[] {
  const monthlyMet: MonthMet[] = [];
  for (let i = 1; i < points.length; i++) {
    const allMet =
      trackedIds.length > 0 &&
      trackedIds.every(
        (id) =>
          balanceOf(points[i], id) - balanceOf(points[i - 1], id) >=
          (monthly[id] || 0)
      );
    const pm = parseMonth(points[i].month);
    monthlyMet.push({ year: pm.year, month: pm.month, onTrack: allMet });
  }
  return monthlyMet;
}

/** Consecutive most-recent met months. */
function currentStreak(monthlyMet: MonthMet[]): number {
  let current = 0;
  for (let i = monthlyMet.length - 1; i >= 0; i--) {
    if (monthlyMet[i].onTrack) current += 1;
    else break;
  }
  return current;
}

/** Longest met run anywhere in history. */
function bestStreak(monthlyMet: MonthMet[]): number {
  let best = 0;
  let run = 0;
  for (const m of monthlyMet) {
    run = m.onTrack ? run + 1 : 0;
    best = Math.max(best, run);
  }
  return best;
}

/**
 * The Jan → Dec calendar strip for the last point's year. Months with no prior
 * month to compare against — before history begins, or in the future — are
 * "upcoming"; resolved months are met/missed. Empty when there is no history.
 */
function buildYearTicks(
  points: HistoryPoint[],
  todayPt: YearMonth | null,
  monthlyMet: MonthMet[]
): YearTick[] {
  if (!todayPt) return [];
  const calYear = todayPt.year;
  const yearTicks: YearTick[] = [];
  for (let m = 0; m < 12; m++) {
    const idx = points.findIndex((p) => {
      const pm = parseMonth(p.month);
      return pm.year === calYear && pm.month === m;
    });
    if (idx < 1) {
      yearTicks.push({ year: calYear, month: m, status: "upcoming" });
      continue;
    }
    yearTicks.push({
      year: calYear,
      month: m,
      status: monthlyMet[idx - 1].onTrack ? "met" : "missed",
    });
  }
  return yearTicks;
}

export function computeSavingsGoal(
  config: SavingsGoalConfig,
  points: HistoryPoint[],
  trackableIds: string[]
): SavingsGoal {
  const ids = trackableIds;
  const todayIdx = points.length - 1;
  const todayPt = lastMonth(points);

  // Months from "today" to the milestone target — null outside Milestone mode
  // or with no history behind it.
  const monthsToTarget =
    config.mode === "milestone"
      ? monthsToTargetFrom(points, config.targetDate)
      : null;

  // Resolve each trackable account's monthly target.
  const monthly =
    config.mode === "milestone" && monthsToTarget
      ? milestoneSplit(config.targetTotal, config.targetDate, points, ids)
      : manualTargets(config, ids);

  // Per-account cumulative progress is scoped to the goal's start month.
  const startIdx = findStartIndex(points, config.startedAt);
  const monthsElapsed =
    startIdx >= 0 && todayIdx >= 0 ? Math.max(0, todayIdx - startIdx) : 0;
  const perAccount = derivePerAccount(
    points,
    ids,
    monthly,
    startIdx,
    todayIdx,
    monthsElapsed
  );

  // A month is "on track" only when every tracked account met its target.
  const trackedIds = perAccount.filter((p) => p.tracked).map((p) => p.id);
  const monthlyMet = scanMonthlyMet(points, trackedIds, monthly);

  const streak: StreakSummary = {
    current: currentStreak(monthlyMet),
    best: bestStreak(monthlyMet),
    yearTicks: buildYearTicks(points, todayPt, monthlyMet),
  };

  return {
    ...config,
    monthly,
    monthsToTarget,
    monthsElapsed,
    perAccount,
    streak,
  };
}
