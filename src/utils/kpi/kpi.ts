/**
 * A single month of projected figures, as consumed by the dashboard KPI strip.
 * Index 0 is always the current month; later indices are forward-projected.
 * `restschuld` is `null` once the mortgage is paid off.
 */
export interface KpiPoint {
  totalLiquid: number;
  restschuld: number | null;
  netCashflow: number;
}

/**
 * One headline metric: its current value, an optional forward delta (percent
 * change across the sparkline window), and the sparkline series itself.
 */
export interface Kpi {
  value: number;
  delta: number | null;
  spark: number[];
}

export interface KpiStrip {
  totalLiquid: Kpi;
  restschuld: Kpi;
  netCashflow: Kpi;
}

/** The sparkline window is the next 12 months, current month included. */
const WINDOW = 12;

/**
 * Percent change from the first to the last point of a sparkline window.
 * Returns null when there is nothing to measure (fewer than two points) or the
 * starting value is zero (divide-by-zero guard).
 */
const pctDelta = (spark: number[]): number | null => {
  if (spark.length < 2) return null;
  const first = spark[0];
  const last = spark[spark.length - 1];
  if (first === 0) return null;
  return ((last - first) / first) * 100;
};

/**
 * Derive the three dashboard KPIs (Total Liquid, Restschuld, Net Cashflow)
 * from a month-by-month projection. Each KPI takes its headline value from the
 * current month (index 0), a sparkline from the forward 12-month window, and a
 * delta measured across that window. Net Cashflow is a value-only KPI and never
 * reports a forward delta.
 */
export const deriveKpiStrip = (points: KpiPoint[]): KpiStrip => {
  const window = points.slice(0, WINDOW);
  const current = points[0];

  const totalLiquidSpark = window.map((p) => p.totalLiquid);
  const restschuldSpark = window.map((p) => p.restschuld ?? 0);
  const netCashflowSpark = window.map((p) => p.netCashflow);

  return {
    totalLiquid: {
      value: current?.totalLiquid ?? 0,
      delta: pctDelta(totalLiquidSpark),
      spark: totalLiquidSpark,
    },
    restschuld: {
      value: current?.restschuld ?? 0,
      delta: pctDelta(restschuldSpark),
      spark: restschuldSpark,
    },
    netCashflow: {
      value: current?.netCashflow ?? 0,
      delta: null,
      spark: netCashflowSpark,
    },
  };
};
