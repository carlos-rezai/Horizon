/**
 * Frontend shapes for the Savings Streak feature.
 *
 * `SavingsGoalConfig` mirrors the server's stored config as it crosses
 * `GET /savings-goal`; `SavingsGoal` is the derived, display-ready shape
 * produced by `computeSavingsGoal` from the config plus reconstructed history.
 * All monetary values are integer cents.
 */

export type SavingsGoalMode = "milestone" | "manual";

/** The persisted goal config (mirrors the server DTO). */
export interface SavingsGoalConfig {
  mode: SavingsGoalMode;
  /** Milestone total target, cents. */
  targetTotal: number;
  /** Milestone target month, "YYYY-MM". */
  targetDate: string;
  /** Month the goal was first set, "YYYY-MM". */
  startedAt: string;
  /** Manual per-account monthly targets, keyed by accountId, cents. */
  manualMonthly: Record<string, number>;
}

/** One trackable account's derived progress for the expanded card rows. */
export interface PerAccountGoal {
  id: string;
  /** This account's monthly target, cents (0 when untracked). */
  target: number;
  /** Whether the account has a positive target and counts toward the streak. */
  tracked: boolean;
  /** Actual balance gain since `startedAt`, cents. */
  cumulativeActual: number;
  /** target × monthsElapsed since `startedAt`, cents. */
  cumulativeTarget: number;
}

export type YearTickStatus = "met" | "missed" | "upcoming";

/** One tile in the Jan→Dec calendar strip. `month` is 0-based. */
export interface YearTick {
  year: number;
  month: number;
  status: YearTickStatus;
}

export interface StreakSummary {
  /** Consecutive most-recent met months. */
  current: number;
  /** Longest met run anywhere in history. */
  best: number;
  /** Jan→Dec ticks for the last history point's year; empty on no history. */
  yearTicks: YearTick[];
}

/** The display-ready goal: config plus everything derived from history. */
export interface SavingsGoal extends SavingsGoalConfig {
  /** Resolved per-account monthly targets, cents (Milestone-derived or Manual). */
  monthly: Record<string, number>;
  /** Months from "today" to the milestone target (null in Manual mode). */
  monthsToTarget: number | null;
  /** Months of history elapsed since `startedAt`. */
  monthsElapsed: number;
  perAccount: PerAccountGoal[];
  streak: StreakSummary;
}
