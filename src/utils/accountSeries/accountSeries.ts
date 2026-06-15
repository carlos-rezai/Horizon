import type { MonthlySnapshot } from "../../types/projection";

/**
 * The month-by-month balance of one account across a projection, in cents.
 * Each point prefers the reconciled `actual` balance and falls back to the
 * `projected` one; a month with no entry for the account counts as zero. Drives
 * the Account Detail hero sparkline (a forward balance trend).
 */
export function accountBalanceSeries(
  snapshots: MonthlySnapshot[],
  accountId: string
): number[] {
  return snapshots.map((s) => {
    const entry = s.accounts[accountId];
    if (entry === undefined) return 0;
    return entry.actual ?? entry.projected;
  });
}
