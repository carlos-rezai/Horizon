import {
  knownSince,
  type BalanceAnchor,
  type DatedAmount,
} from "../balanceAnchor/balanceAnchor.js";

export interface HistorySpanAccount extends BalanceAnchor {
  id: string;
}

export interface HistorySpanTransaction extends DatedAmount {
  accountId: string;
}

/**
 * The first month ("YYYY-MM") of the History Span: the earliest Known Since
 * across all accounts, never later than the current month.
 */
export function historySpanStart(
  accounts: readonly HistorySpanAccount[],
  transactions: readonly HistorySpanTransaction[],
  currentMonth: string
): string {
  return accounts.reduce((earliest, account) => {
    const own = transactions.filter((tx) => tx.accountId === account.id);
    const month = knownSince(account, own).slice(0, 7);
    return month < earliest ? month : earliest;
  }, currentMonth);
}
