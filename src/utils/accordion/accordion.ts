/**
 * One projected month reduced to the figures the Projection Accordion's
 * collapsed year row needs. `restschuld` is the total Mortgage balance.
 */
export interface YearAggPoint {
  month: string;
  totalLiquid: number;
  restschuld: number;
  netCashflow: number;
}

export interface YearSummary {
  year: number;
  /** End-of-year Total Liquid (the year's final month). */
  totalLiquid: number;
  /** End-of-year Restschuld (the year's final month). */
  restschuld: number;
  /** Sum of the year's monthly Net Cashflow. */
  netCashflow: number;
  /** Sum of Restschuld step-downs that occurred during the year. */
  sondertilgung: number;
}

/**
 * Collapse a month-by-month projection into one summary per year. Net Cashflow
 * is summed; Total Liquid and Restschuld are taken from the year's final month;
 * Sondertilgung is the sum of Restschuld step-downs attributed to the year the
 * step occurred in (each step-down is one ST payment in the ST-only model).
 */
export function aggregateYearSummaries(points: YearAggPoint[]): YearSummary[] {
  const order: number[] = [];
  const byYear = new Map<number, YearSummary>();

  points.forEach((point, i) => {
    const year = parseInt(point.month.slice(0, 4), 10);
    let summary = byYear.get(year);
    if (!summary) {
      summary = {
        year,
        totalLiquid: 0,
        restschuld: 0,
        netCashflow: 0,
        sondertilgung: 0,
      };
      byYear.set(year, summary);
      order.push(year);
    }

    summary.netCashflow += point.netCashflow;
    // The year's final month wins for end-of-year balances (points are ordered).
    summary.totalLiquid = point.totalLiquid;
    summary.restschuld = point.restschuld;

    if (i > 0) {
      const step = points[i - 1].restschuld - point.restschuld;
      if (step > 0) summary.sondertilgung += step;
    }
  });

  return order.map((year) => byYear.get(year)!);
}
