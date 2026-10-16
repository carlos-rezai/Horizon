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

/**
 * Today as an ISO date (`YYYY-MM-DD`), in local time.
 *
 * Horizon's server runs on the user's own machine, so "today" is that
 * machine's wall-clock date — not the UTC date `toISOString()` would give.
 * The client's `todayIso` follows the same rule.
 */
export function todayIso(): string {
  const d = new Date();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/**
 * The current month as `YYYY-MM`, in local time — the month of `todayIso`.
 * The client's `currentMonth` follows the same rule.
 */
export function currentMonth(): string {
  return todayIso().slice(0, 7);
}

/** The number of whole months from one `YYYY-MM` month to another. */
export function monthsBetween(from: string, to: string): number {
  const a = parseYearMonth(from);
  const b = parseYearMonth(to);
  return (b.year - a.year) * 12 + (b.month - a.month);
}

/** The number of days in a `YYYY-MM` month, leap years included. */
export function daysInMonth(yearMonth: string): number {
  const { year, month } = parseYearMonth(yearMonth);
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** The last ISO date (`YYYY-MM-DD`) of a `YYYY-MM` month. */
export function endOfMonth(yearMonth: string): string {
  return `${yearMonth}-${String(daysInMonth(yearMonth)).padStart(2, "0")}`;
}
