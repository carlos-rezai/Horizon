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
  /** Sum of every Restschuld step-down (each is a Sondertilgung payment). */
  totalSondertilgung: number;
  /** Number of months in which a Sondertilgung fired. */
  sondertilgungCount: number;
}

/**
 * Derive the three Outlook summary figures from a month-by-month projection.
 * In the ST-only model the Restschuld only ever decreases via a Sondertilgung,
 * so each month-over-month step-down is one ST payment.
 */
export function deriveOutlookSummary(points: OutlookPoint[]): OutlookSummary {
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
  for (let i = 1; i < points.length; i++) {
    const step = points[i - 1].restschuld - points[i].restschuld;
    if (step > 0) {
      totalSondertilgung += step;
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
