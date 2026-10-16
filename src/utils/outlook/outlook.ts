import type { MonthlySnapshot } from "../../types/projection";
import { findDebtFreeMonth, totalRestschuld } from "../projection/projection";

export interface OutlookSummary {
  /** Total Liquid at the end of the projection. */
  finalTotalLiquid: number;
  /** Calendar year of the final projected month. */
  finalYear: number;
  /**
   * The Debt-free Month, or null if it never comes — and null when the
   * projection starts with no debt at all.
   */
  debtFreeMonth: string | null;
  /** Sum of every effective Sondertilgung payment in the ST map. */
  totalSondertilgung: number;
  /** Number of months in which a Sondertilgung reduced the Restschuld. */
  sondertilgungCount: number;
}

/**
 * Derive the three Outlook summary figures from a month-by-month projection.
 * Sondertilgung is totalled and counted from `stMonths` — the effective ST
 * Months (annual Repayment Transfers firing while Restschuld remains, see
 * `effectiveSTMonths`) — never from Restschuld step-downs, which also include
 * the monthly repayment.
 */
export function deriveOutlookSummary(
  snapshots: MonthlySnapshot[],
  mortgageIds: string[],
  stMonths: Map<string, number>
): OutlookSummary {
  if (snapshots.length === 0) {
    return {
      finalTotalLiquid: 0,
      finalYear: 0,
      debtFreeMonth: null,
      totalSondertilgung: 0,
      sondertilgungCount: 0,
    };
  }

  const last = snapshots[snapshots.length - 1];
  const finalYear = parseInt(last.month.slice(0, 4), 10);

  // A projection that starts debt-free has nothing to count down to: the
  // tile reads "—" rather than flagging its first month.
  const hasDebt = totalRestschuld(snapshots[0], mortgageIds) > 0;
  const debtFreeMonth = hasDebt
    ? findDebtFreeMonth(snapshots, mortgageIds)
    : null;

  let totalSondertilgung = 0;
  let sondertilgungCount = 0;
  for (const amount of stMonths.values()) {
    if (amount > 0) {
      totalSondertilgung += amount;
      sondertilgungCount += 1;
    }
  }

  return {
    finalTotalLiquid: last.totalLiquid,
    finalYear,
    debtFreeMonth,
    totalSondertilgung,
    sondertilgungCount,
  };
}
