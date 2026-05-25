import type { AccountKind } from "../../storage/types.js";

export interface TxEntry {
  amount: number;
  accountId: string;
  transferId?: string;
}

export interface AccountEntry {
  _id: string;
  kind: AccountKind;
  balance: number;
}

const LIQUID_KINDS: AccountKind[] = ["Girokonto", "Tagesgeld"];

export function calcNetCashflow(transactions: TxEntry[]): number {
  return transactions
    .filter((tx) => !tx.transferId)
    .reduce((sum, tx) => sum + tx.amount, 0);
}

export function calcFreeCashflow(
  transactions: TxEntry[],
  accountId: string
): number {
  return transactions
    .filter((tx) => tx.accountId === accountId && !tx.transferId)
    .reduce((sum, tx) => sum + tx.amount, 0);
}

export function calcTotalLiquid(accounts: AccountEntry[]): number {
  return accounts
    .filter((a) => LIQUID_KINDS.includes(a.kind))
    .reduce((sum, a) => sum + a.balance, 0);
}
