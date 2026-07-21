/**
 * Cache key for a month's transactions on a given set of accounts.
 *
 * Keying on the accounts *and* the month is what makes stepping back to a
 * month you already looked at instant: each pair keeps its own entry, so a
 * revisit paints from cache instead of refetching. A single-account read and
 * a one-account aggregate read produce the same key on purpose — they are the
 * same request.
 */
export function monthTransactionsKey(
  accountIds: readonly string[],
  month: string
): string {
  return `transactions:${accountIds.join(",")}:${month}`;
}
