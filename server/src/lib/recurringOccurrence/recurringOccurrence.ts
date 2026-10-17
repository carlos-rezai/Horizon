/**
 * Recurring occurrence: the one firing rule every loop shares — the Replay
 * Loop, the Forward Projection and Recurring History. Firing is a pure
 * function of the rule and the month, never of where a run starts. Months are
 * `YYYY-MM`, dates ISO `YYYY-MM-DD`.
 */
import type { Frequency } from "../../storage/types.js";
import { daysInMonth, monthsBetween } from "../date/date.js";

/** Which end of a Recurring Transfer an account is. */
export type TransferSide = "source" | "destination";

export interface FiringRule {
  frequency: Frequency;
  monthOfYear?: number;
}

/**
 * Whether a rule fires in `month`. A rule with a month of year fires in every
 * calendar month of its cycle (annual: that month; quarterly: every third
 * month from it). A legacy rule without one counts its cycle from its source
 * account's Anchor month.
 */
export function firesInMonth(
  rule: FiringRule,
  month: string,
  sourceAnchorMonth: string
): boolean {
  if (rule.frequency === "monthly") return true;
  const period = rule.frequency === "quarterly" ? 3 : 12;

  const distance =
    rule.monthOfYear != null
      ? parseInt(month.slice(5, 7), 10) - rule.monthOfYear
      : monthsBetween(sourceAnchorMonth, month);
  return ((distance % period) + period) % period === 0;
}

/** An occurrence's date: the month's day of month, clamped to its length. */
export function occurrenceDate(month: string, dayOfMonth: number): string {
  const day = Math.min(dayOfMonth, daysInMonth(month));
  return `${month}-${String(day).padStart(2, "0")}`;
}

/**
 * Anchor Gate: a leg moves its account only when dated after the account's
 * Anchor Date — the Anchor Balance already contains it. An account with no
 * anchor lets every leg through.
 */
export function passesAnchorGate(
  anchorDate: string | undefined,
  date: string
): boolean {
  return !anchorDate || date > anchorDate;
}
