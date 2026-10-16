/**
 * The History page's range: the 1 Year / 3 Years / All history chips, shared
 * by the chart and the trends card, and the rule that windows the points.
 */
import type { HistoryPoint } from "../historyTypes/historyTypes";

export type HistoryRange = "1y" | "3y" | "all";

export interface HistoryRangeOption {
  value: HistoryRange;
  label: string;
  months: number;
}

export const HISTORY_RANGE_OPTIONS: HistoryRangeOption[] = [
  { value: "1y", label: "1 Year", months: 12 },
  { value: "3y", label: "3 Years", months: 36 },
  { value: "all", label: "All history", months: Infinity },
];

/**
 * The points a range shows. The range narrows from the right edge (TODAY), so
 * a shorter window always keeps the most recent months rather than the
 * earliest; "All history" keeps every point.
 */
export function pointsInRange(
  points: HistoryPoint[],
  range: HistoryRange
): HistoryPoint[] {
  const months =
    HISTORY_RANGE_OPTIONS.find((o) => o.value === range)?.months ?? Infinity;
  return points.slice(Math.max(0, points.length - months));
}
