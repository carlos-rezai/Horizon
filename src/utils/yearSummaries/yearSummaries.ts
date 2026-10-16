/**
 * One projected month reduced to the figures a year accordion's collapsed
 * year row needs. `restschuld` is the total Mortgage balance; `accounts` is
 * the projected balance of each non-Mortgage account, keyed by account id.
 */
export interface YearAggPoint {
  month: string;
  totalLiquid: number;
  restschuld: number;
  netCashflow: number;
  accounts: Record<string, number>;
}

export interface YearSummary {
  year: number;
  /** End-of-year Total Liquid (the year's final month). */
  totalLiquid: number;
  /** End-of-year Restschuld (the year's final month). */
  restschuld: number;
  /** Sum of the year's monthly Net Cashflow. */
  netCashflow: number;
  /** End-of-year projected balance per account (the year's final month). */
  accounts: Record<string, number>;
}

/**
 * Collapse a month-by-month projection into one summary per year. Net Cashflow
 * is summed; Total Liquid, Restschuld and the per-account balances are taken
 * from the year's final available month.
 */
export function aggregateYearSummaries(points: YearAggPoint[]): YearSummary[] {
  const order: number[] = [];
  const byYear = new Map<number, YearSummary>();

  for (const point of points) {
    const year = parseInt(point.month.slice(0, 4), 10);
    let summary = byYear.get(year);
    if (!summary) {
      summary = {
        year,
        totalLiquid: 0,
        restschuld: 0,
        netCashflow: 0,
        accounts: {},
      };
      byYear.set(year, summary);
      order.push(year);
    }

    summary.netCashflow += point.netCashflow;
    // The year's final month wins for end-of-year balances (points are ordered).
    summary.totalLiquid = point.totalLiquid;
    summary.restschuld = point.restschuld;
    summary.accounts = { ...point.accounts };
  }

  return order.map((year) => byYear.get(year)!);
}

/**
 * Group month-by-month entries by calendar year, keeping each year's months in
 * input order. Years iterate in the order they first appear.
 */
export function groupByYear<T extends { month: string }>(
  entries: T[]
): Map<number, T[]> {
  const groups = new Map<number, T[]>();
  for (const entry of entries) {
    const year = parseInt(entry.month.slice(0, 4), 10);
    const group = groups.get(year);
    if (group) group.push(entry);
    else groups.set(year, [entry]);
  }
  return groups;
}

/**
 * Total an ST map (`YYYY-MM` → amount) per calendar year. A year without a
 * Sondertilgung has no entry.
 */
export function stTotalsByYear(
  stMonths: Map<string, number>
): Map<number, number> {
  const totals = new Map<number, number>();
  for (const [month, amount] of stMonths) {
    const year = parseInt(month.slice(0, 4), 10);
    totals.set(year, (totals.get(year) ?? 0) + amount);
  }
  return totals;
}
