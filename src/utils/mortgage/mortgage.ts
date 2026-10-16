import type { RecurringTransaction } from "../../types/recurring";

/**
 * Percentage of a mortgage's original principal that has already been repaid,
 * derived from the current Restschuld (remaining balance). Both arguments are
 * in cents. The result is clamped to the inclusive range [0, 100].
 */
export function percentPaidOff(
  originalPrincipal: number,
  restschuld: number
): number {
  if (originalPrincipal <= 0) return 0;
  const paid = originalPrincipal - restschuld;
  const percent = (paid / originalPrincipal) * 100;
  if (percent < 0) return 0;
  if (percent > 100) return 100;
  return percent;
}

/**
 * Whether any recurring transaction is a transfer into the given mortgage —
 * that is, linked to it. A recurring that merely sits on the mortgage account
 * without a link does not repay it.
 */
export function hasRepaymentTransfer(
  recurrings: RecurringTransaction[],
  mortgageId: string
): boolean {
  return recurrings.some((r) => r.linkedAccountId === mortgageId);
}
