/**
 * The client mirror of the server's `HistoryPoint`, as it crosses
 * `GET /projection/history`. The server owns the reconstruction; the history,
 * savings and projection features and the projection and savings-goal utils
 * all read it. All monetary values are integer cents.
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
  /**
   * Monthly Savings: Σ of the Trackable Accounts' month-over-month gains; null
   * in the span's first month and when a Trackable Account is Unknown that
   * month or the month before.
   */
  monthlySavings?: number | null;
  /**
   * Monthly Spending: the magnitude of the month's Variable Spending outflows
   * on the spending accounts; null when no spending account is known that
   * month, a real 0 in a known month with none.
   */
  monthlySpending?: number | null;
  /** Per-account balance; null before that account's Known Since. */
  accounts: Record<string, number | null>;
}
