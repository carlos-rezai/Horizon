/**
 * Frontend shapes for the History feature.
 *
 * The backend ("Historical Month Navigation") owns the reconstruction; this
 * type mirrors the server's `HistoryPoint` as it crosses `GET
 * /projection/history`. All monetary values are integer cents.
 */

/** A single reconstructed month as returned by `GET /projection/history`. */
export interface HistoryPoint {
  /** "YYYY-MM" */
  month: string;
  /** Σ of the liquid accounts known that month; null when none is known. */
  totalLiquid: number | null;
  /**
   * The mortgage's replayed balance (0 when there is no mortgage); null
   * before the Mortgage's Known Since.
   */
  restschuld: number | null;
  /**
   * The Paydown Bridge: a straight line from the Original Principal in the
   * Mortgage Start month to the Restschuld in the Mortgage's first known month
   * (inclusive). Null elsewhere. Not monthly data: never shown as an amount.
   */
  restschuldBridge?: number | null;
  /** Σ of that month's real stored transactions. */
  netCashflow: number;
  /** Per-account balance; null before that account's Known Since. */
  accounts: Record<string, number | null>;
}
