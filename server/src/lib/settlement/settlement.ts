import type {
  Account,
  RecurringTransaction,
  Transaction,
  TransferCreateInput,
} from "../../storage/types.js";
import { balanceAt } from "../balanceAnchor/balanceAnchor.js";
import { addMonths, endOfMonth } from "../date/date.js";
import { occurrenceDate } from "../recurringOccurrence/recurringOccurrence.js";
import { recurringHistory } from "../recurringHistory/recurringHistory.js";
import type { MonthlySnapshot } from "../projection/projection.js";

export type SettlementTransferInput = TransferCreateInput & {
  isAutoSettlement: true;
};

export interface InsufficientFundsWarning {
  ccAccountId: string;
  fundingAccountId: string;
  settlementAmount: number;
  settlementMonth: string;
  settlementDay: number;
}

/** The description and category an auto-settlement is booked with. */
export const SETTLEMENT_DESCRIPTION = "Auto-settlement";
export const SETTLEMENT_CATEGORY = "Transfer";

export function computeMissingSettlements(
  accounts: Account[],
  transactions: Transaction[],
  asOf: string,
  recurrings: RecurringTransaction[] = []
): SettlementTransferInput[] {
  const result: SettlementTransferInput[] = [];
  const lastMonth = asOf.slice(0, 7);

  for (const cc of accounts) {
    if (cc.kind !== "CreditCard") continue;
    if (!cc.linkedAccountId || !cc.settlementDay || !cc.linkedSince) continue;

    const { linkedAccountId, settlementDay } = cc;

    const ccTxs = transactions.filter((tx) => tx.accountId === cc.id);
    const virtualSettlements: Array<{ date: string; amount: number }> = [];

    for (
      let month = cc.linkedSince.slice(0, 7);
      month <= lastMonth;
      month = addMonths(month, 1)
    ) {
      const nextMonth = addMonths(month, 1);
      const cutoff = `${nextMonth}-01`;
      const settlementDate = occurrenceDate(nextMonth, settlementDay);

      const alreadyExists =
        ccTxs.some((tx) => tx.isAutoSettlement && tx.date === settlementDate) ||
        virtualSettlements.some((v) => v.date === settlementDate);

      if (!alreadyExists) {
        const closingDate = endOfMonth(month);
        const closingBalance =
          balanceAt(
            cc,
            [...ccTxs, ...virtualSettlements.filter((v) => v.date < cutoff)],
            closingDate
          ) + recurringHistory(cc.id, accounts, recurrings, closingDate);

        if (closingBalance < 0) {
          const amount = -closingBalance;
          result.push({
            fromAccountId: linkedAccountId,
            toAccountId: cc.id,
            amount,
            date: settlementDate,
            description: SETTLEMENT_DESCRIPTION,
            category: SETTLEMENT_CATEGORY,
            isAutoSettlement: true,
          });
          virtualSettlements.push({ date: settlementDate, amount });
        }
      }
    }
  }

  return result;
}

export function detectInsufficientFunds(
  accounts: Account[],
  projection: MonthlySnapshot[]
): InsufficientFundsWarning[] {
  const warnings: InsufficientFundsWarning[] = [];

  for (const cc of accounts) {
    if (cc.kind !== "CreditCard") continue;
    if (!cc.linkedAccountId || !cc.settlementDay || !cc.linkedSince) continue;

    for (let i = 0; i < projection.length - 1; i++) {
      const current = projection[i];
      const next = projection[i + 1];
      const ccBalance = current.accounts[cc.id]?.projected ?? 0;

      if (ccBalance >= 0) continue;

      const giroBalance = next.accounts[cc.linkedAccountId]?.projected ?? 0;
      if (giroBalance < 0) {
        warnings.push({
          ccAccountId: cc.id,
          fundingAccountId: cc.linkedAccountId,
          settlementAmount: -ccBalance,
          settlementMonth: next.month,
          settlementDay: cc.settlementDay,
        });
      }
      break;
    }
  }

  return warnings;
}
