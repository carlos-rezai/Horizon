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
  /** Σ of liquid accounts' balances. */
  totalLiquid: number;
  /** The mortgage's replayed balance (0 when there is no mortgage). */
  restschuld: number;
  /** Σ of that month's real stored transactions. */
  netCashflow: number;
  /** Per-account balance. */
  accounts: Record<string, number>;
}
