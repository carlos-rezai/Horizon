/**
 * Balance Anchor: an account's known balance on a known date, which every
 * other balance is derived from — forwards after the Anchor Date, backwards
 * before it. The anchor is end of day, so a transaction dated on the Anchor
 * Date is already part of the Anchor Balance. All dates are ISO strings and
 * compare lexicographically; all amounts are cents.
 */

export interface BalanceAnchor {
  anchorBalance: number;
  anchorDate: string;
}

export interface DatedAmount {
  date: string;
  amount: number;
}

/**
 * The balance at the end of `date`. After the anchor: the Anchor Balance plus
 * the transactions dated after the anchor, up to and including `date`. Before
 * it: the Anchor Balance minus the transactions dated after `date`, up to and
 * including the Anchor Date. Before Known Since this stays flat at the balance
 * before the oldest transaction.
 */
export function balanceAt(
  anchor: BalanceAnchor,
  transactions: readonly DatedAmount[],
  date: string
): number {
  const { anchorBalance, anchorDate } = anchor;
  let balance = anchorBalance;
  for (const tx of transactions) {
    if (date >= anchorDate) {
      if (tx.date > anchorDate && tx.date <= date) balance += tx.amount;
    } else if (tx.date > date && tx.date <= anchorDate) {
      balance -= tx.amount;
    }
  }
  return balance;
}

/**
 * The earliest date the balance is known from: the Anchor Date or the oldest
 * transaction's date, whichever is earlier — whatever the transaction's
 * source (import, manual entry or settlement).
 */
export function knownSince(
  anchor: BalanceAnchor,
  transactions: readonly DatedAmount[]
): string {
  return transactions.reduce(
    (earliest, tx) => (tx.date < earliest ? tx.date : earliest),
    anchor.anchorDate
  );
}
