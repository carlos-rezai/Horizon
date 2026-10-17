import type { MonthlySnapshot } from "../../../types/projection";
import type { HistoryPoint } from "../../../types/history";
import { firstKnownMonths } from "../../history";

/**
 * Where an account ends a month: a figure read as Actual (History) or
 * Projected (the projection), or Unknown — never a stand-in €0.
 */
export type MonthEndBalance =
  | { basis: "actual" | "projected"; cents: number }
  | {
      basis: "unknown";
      /** The account's first known History month ("YYYY-MM"), if any. */
      knownFrom: string | null;
    };

/**
 * The Month-End Balance of one account, by the Past Lead-in's join rule: the
 * current and later months read the projection snapshot, earlier months read
 * the History point. A month neither source covers is Unknown.
 */
export function monthEndBalance(
  month: string,
  currentMonth: string,
  snapshots: MonthlySnapshot[],
  points: HistoryPoint[],
  accountId: string
): MonthEndBalance {
  if (month >= currentMonth) {
    const entry = snapshots.find((s) => s.month === month)?.accounts[accountId];
    if (entry !== undefined)
      return { basis: "projected", cents: entry.projected };
  } else {
    const value = points.find((p) => p.month === month)?.accounts[accountId];
    if (value !== undefined && value !== null) {
      return { basis: "actual", cents: value };
    }
  }
  return {
    basis: "unknown",
    knownFrom: firstKnownMonths(points)[accountId] ?? null,
  };
}
