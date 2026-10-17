import type { TransferSide } from "./recurring";

/**
 * One row of an account's Fixed Flows: a recurring leg the engine applied in
 * the month, joined with its rule's description and category. `amount` is
 * signed integer cents for this account.
 */
export interface RecurringFixedFlow {
  kind: "recurring";
  recurringId: string;
  /** ISO date "YYYY-MM-DD" */
  date: string;
  description: string;
  category?: string;
  amount: number;
  counterpartId?: string;
  side?: TransferSide;
  /** Blocked by the Anchor Gate, and left out of the group's net. */
  inAnchor: boolean;
}

/**
 * A CreditCard settlement leg: the stored auto-settlement in a past or the
 * current month, the engine's projected one in a future month. `amount` is
 * signed integer cents for this account; `counterpartId` is the other account.
 */
export interface SettlementFixedFlow {
  kind: "settlement";
  /** ISO date "YYYY-MM-DD" */
  date: string;
  description: string;
  category?: string;
  amount: number;
  counterpartId: string;
  side: TransferSide;
  inAnchor: boolean;
}

export type FixedFlow = RecurringFixedFlow | SettlementFixedFlow;

export interface AccountFixedFlows {
  accountId: string;
  flows: FixedFlow[];
}

/** The `GET /reports/month-cash-flow?month=YYYY-MM` payload. */
export interface MonthCashFlowReport {
  /** "YYYY-MM" */
  month: string;
  accounts: AccountFixedFlows[];
}
