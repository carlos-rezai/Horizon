/**
 * One row of an account's Fixed Flows on Month Overview: a recurring leg the
 * projection applies in the month. `amount` is signed integer cents for this
 * account; a transfer leg names its counterpart and which side it is.
 */
export interface FixedFlow {
  kind: "recurring" | "settlement";
  /** The rule behind a recurring row. */
  recurringId?: string;
  /** ISO date "YYYY-MM-DD" */
  date: string;
  description: string;
  category?: string;
  amount: number;
  counterpartId?: string;
  side?: "source" | "destination";
  /** Blocked by the Anchor Gate, and left out of the group's net. */
  inAnchor: boolean;
}

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
