import {
  knownSince,
  type BalanceAnchor,
  type DatedAmount,
} from "../balanceAnchor/balanceAnchor.js";
import type { AccountKind } from "../../storage/types.js";

export interface HistorySpanAccount extends BalanceAnchor {
  id: string;
  kind?: AccountKind;
  /** The Mortgage's Original Principal in cents, when originated. */
  originalPrincipal?: number;
  /** The Mortgage Start date (ISO), when originated. */
  startDate?: string;
}

export interface HistorySpanTransaction extends DatedAmount {
  accountId: string;
}

/**
 * The first month ("YYYY-MM") of the History Span: the earliest Known Since
 * across all accounts (or an originated Mortgage's Mortgage Start month, when
 * earlier), never later than the current month.
 */
export function historySpanStart(
  accounts: readonly HistorySpanAccount[],
  transactions: readonly HistorySpanTransaction[],
  currentMonth: string
): string {
  return accounts.reduce((earliest, account) => {
    const own = transactions.filter((tx) => tx.accountId === account.id);
    const known = knownSince(account, own).slice(0, 7);
    const mortgageStart =
      account.kind === "Mortgage" &&
      account.originalPrincipal !== undefined &&
      account.startDate !== undefined
        ? account.startDate.slice(0, 7)
        : known;
    const month = mortgageStart < known ? mortgageStart : known;
    return month < earliest ? month : earliest;
  }, currentMonth);
}
