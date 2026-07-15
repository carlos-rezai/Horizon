import type { HistoryPoint } from "../history/historyTypes";
import type {
  PerAccountGoal,
  SavingsGoal,
  SavingsGoalConfig,
  YearTick,
} from "./savingsTypes";

// ---------------------------------------------------------------------------
// computeSavingsGoal — a pure port of the prototype's savings-goal logic
// (docs/handoff/savings-streak/prototype/src/data.js). The arithmetic is
// unchanged; two implicit prototype edges are made explicit here:
//   • balances are read from `point.accounts[id]` (not `point[id]`), and
//   • months are "YYYY-MM" strings (not `{ year, month }` objects).
// "Today" and the calendar-strip year are derived from the LAST history point,
// never `new Date()`, so the function is deterministic on its inputs. Empty
// history yields a zeroed goal (streak 0, no ticks) rather than throwing.
// ---------------------------------------------------------------------------

/** Parse "YYYY-MM" into a 0-based { year, month }. */
function parseMonth(ym: string): { year: number; month: number } {
  const [year, month] = ym.split("-").map(Number);
  return { year, month: month - 1 };
}

/** A point's balance for an account, treating a missing account as 0. */
function balanceOf(point: HistoryPoint, id: string): number {
  return point.accounts[id] ?? 0;
}

export function computeSavingsGoal(
  config: SavingsGoalConfig,
  points: HistoryPoint[],
  trackableIds: string[]
): SavingsGoal {
  const ids = trackableIds;
  const todayIdx = points.length - 1;
  const todayPt = todayIdx >= 0 ? parseMonth(points[todayIdx].month) : null;

  // Months from "today" to the milestone target — only meaningful in Milestone
  // mode with history behind it; null otherwise.
  const target = parseMonth(config.targetDate);
  const monthsToTarget =
    config.mode === "milestone" && todayPt
      ? Math.max(
          1,
          (target.year - todayPt.year) * 12 + (target.month - todayPt.month)
        )
      : null;

  // Resolve each trackable account's monthly target.
  const monthly: Record<string, number> = {};
  if (config.mode === "milestone" && monthsToTarget) {
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
    const requiredMonthly = config.targetTotal / monthsToTarget;
    for (const id of ids) {
      monthly[id] =
        wSum > 0 ? Math.round(requiredMonthly * (weights[id] / wSum)) : 0;
    }
  } else {
    for (const id of ids) {
      monthly[id] = config.manualMonthly?.[id] ?? 0;
    }
  }

  // Per-account cumulative progress is scoped to the goal's start month.
  const start = parseMonth(config.startedAt);
  const startIdx = points.findIndex((p) => {
    const pm = parseMonth(p.month);
    return pm.year === start.year && pm.month === start.month;
  });
  const monthsElapsed =
    startIdx >= 0 && todayIdx >= 0 ? Math.max(0, todayIdx - startIdx) : 0;

  const perAccount: PerAccountGoal[] = ids.map((id) => {
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

  // A month is "on track" only when every tracked account met its target.
  const trackedIds = perAccount.filter((p) => p.tracked).map((p) => p.id);
  const monthlyMet: { year: number; month: number; onTrack: boolean }[] = [];
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

  let current = 0;
  for (let i = monthlyMet.length - 1; i >= 0; i--) {
    if (monthlyMet[i].onTrack) current += 1;
    else break;
  }
  let best = 0;
  let run = 0;
  for (const m of monthlyMet) {
    run = m.onTrack ? run + 1 : 0;
    best = Math.max(best, run);
  }

  // Calendar-year strip: Jan → Dec of the last point's year. Months with no
  // prior month to compare against (before history begins, or in the future)
  // are "upcoming"; resolved months are met/missed.
  const yearTicks: YearTick[] = [];
  if (todayPt) {
    const calYear = todayPt.year;
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
  }

  return {
    ...config,
    monthly,
    monthsToTarget,
    monthsElapsed,
    perAccount,
    streak: { current, best, yearTicks },
  };
}
