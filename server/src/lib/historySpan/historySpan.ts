import {
  knownSince,
  type BalanceAnchor,
  type DatedAmount,
} from "../balanceAnchor/balanceAnchor.js";
import type { AccountKind } from "../../storage/types.js";
import type { HistoryAccount } from "../projection/history.js";

/** The origination fields `mortgageStartMonth` reads off an account. */
type OriginationFields = Pick<
  HistoryAccount,
  "originalPrincipal" | "startDate"
>;

export interface HistorySpanAccount extends BalanceAnchor, OriginationFields {
  id: string;
  /** Optional: an anchor-only account need not say what kind it is. */
  kind?: AccountKind;
}

/**
 * The Mortgage Start month ("YYYY-MM") of an originated Mortgage — one with
 * both an Original Principal and a Mortgage Start date. Null for any other
 * account, and for a Mortgage missing either origination field.
 */
export function mortgageStartMonth(
  account: OriginationFields & { kind?: AccountKind }
): string | null {
  if (
    account.kind !== "Mortgage" ||
    account.originalPrincipal === undefined ||
    account.startDate === undefined
  ) {
    return null;
  }
  return account.startDate.slice(0, 7);
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
    const mortgageStart = mortgageStartMonth(account) ?? known;
    const month = mortgageStart < known ? mortgageStart : known;
    return month < earliest ? month : earliest;
  }, currentMonth);
}
