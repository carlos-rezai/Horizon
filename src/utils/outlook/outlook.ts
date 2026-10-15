/**
 * One projected month, reduced to the figures the Outlook summary needs.
 * `restschuld` is the total Mortgage balance for the month (0 once paid off).
 */
export interface OutlookPoint {
  month: string;
  totalLiquid: number;
  restschuld: number;
}

export interface OutlookSummary {
  /** Total Liquid at the end of the projection. */
  finalTotalLiquid: number;
  /** Calendar year of the final projected month. */
  finalYear: number;
  /** First month the Restschuld reaches zero, or null if it never does. */
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
  points: OutlookPoint[],
  stMonths: Map<string, number>
): OutlookSummary {
  if (points.length === 0) {
    return {
      finalTotalLiquid: 0,
      finalYear: 0,
      debtFreeMonth: null,
      totalSondertilgung: 0,
      sondertilgungCount: 0,
    };
  }

  const last = points[points.length - 1];
  const finalYear = parseInt(last.month.slice(0, 4), 10);

  const hasDebt = points[0].restschuld > 0;
  let debtFreeMonth: string | null = null;
  if (hasDebt) {
    const paidOff = points.find((p) => p.restschuld <= 0);
    debtFreeMonth = paidOff ? paidOff.month : null;
  }

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
