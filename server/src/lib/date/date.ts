/**
 * Split an ISO date or year-month string into its numeric year and month.
 *
 * Accepts both `YYYY-MM` and `YYYY-MM-DD`: only the first two dash-separated
 * segments are read, so the trailing day (if any) is ignored. The returned
 * `month` is 1-based (January is 1), with any leading zero already discarded
 * by numeric coercion.
 */
export function parseYearMonth(value: string): { year: number; month: number } {
  const [year, month] = value.split("-").map(Number);
  return { year, month };
}
