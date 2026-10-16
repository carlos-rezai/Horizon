/**
 * Known Since on the client: the history surfaces' rules about Unknown
 * months. A balance is `null` in a month before its series' Known Since —
 * the server derives that; these rules only read it off the points.
 */
import type { HistoryPoint } from "../../../types/history";

/**
 * The first month each series carries a non-null value, keyed by series key:
 * `totalLiquid`, `restschuld`, and each account id. A series that is never
 * known is absent from the result.
 */
export function firstKnownMonths(
  points: HistoryPoint[]
): Record<string, string> {
  const first: Record<string, string> = {};
  const note = (key: string, value: number | null, month: string) => {
    if (value !== null && first[key] === undefined) first[key] = month;
  };
  for (const p of points) {
    note("totalLiquid", p.totalLiquid, p.month);
    note("restschuld", p.restschuld, p.month);
    for (const [id, value] of Object.entries(p.accounts)) {
      note(id, value, p.month);
    }
  }
  return first;
}

/** True when the month is entirely Unknown: every series in it is `null`. */
export function isUnknownMonth(point: HistoryPoint): boolean {
  return (
    point.totalLiquid === null &&
    point.restschuld === null &&
    Object.values(point.accounts).every((v) => v === null)
  );
}

/** The `HistoryPoint` fields that hold a single amount (or null). */
export type NumericHistoryField = {
  [K in keyof HistoryPoint]-?: HistoryPoint[K] extends number | null | undefined
    ? K
    : never;
}[keyof HistoryPoint];

/** The first month in which `field` is non-null, or null when it never is. */
export function firstKnownMonthOf(
  points: HistoryPoint[],
  field: NumericHistoryField
): string | null {
  return points.find((p) => typeof p[field] === "number")?.month ?? null;
}

/** Years holding at least one month that is not Unknown, newest first. */
export function knownYears(points: HistoryPoint[]): number[] {
  const years = new Set<number>();
  for (const p of points) {
    if (!isUnknownMonth(p)) years.add(Number(p.month.slice(0, 4)));
  }
  return [...years].sort((a, b) => b - a);
}
