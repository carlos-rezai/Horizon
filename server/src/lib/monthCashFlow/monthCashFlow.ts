import type { Account, RecurringTransaction } from "../../storage/types.js";
import type { MonthlyProjection } from "../projection/projection.js";

/**
 * One row of an account's Fixed Flows: a recurring leg the engine applied in
 * the month, joined with its rule's description and category. `amount` is
 * signed integer cents for this account.
 */
export interface FixedFlow {
  kind: "recurring";
  recurringId: string;
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

export interface MonthCashFlowReport {
  /** "YYYY-MM" */
  month: string;
  accounts: AccountFixedFlows[];
}

/**
 * The Month Cash Flow Report for `month`: one group per account, in the order
 * given (storage's sortOrder), each listing the recurring flows the run applied
 * to it that month, ordered by date. A month the run does not cover yields
 * empty groups.
 */
export function deriveMonthCashFlow(
  month: string,
  projected: MonthlyProjection[],
  accounts: Account[],
  recurrings: RecurringTransaction[]
): MonthCashFlowReport {
  const rules = new Map(recurrings.map((r) => [r.id, r]));
  const applied = projected.find((m) => m.month === month)?.flows ?? [];

  const groups = accounts.map((account): AccountFixedFlows => {
    const flows: FixedFlow[] = [];
    for (const flow of applied) {
      if (flow.accountId !== account.id) continue;
      const rule = rules.get(flow.recurringId);
      if (!rule) continue;
      flows.push({
        kind: "recurring",
        recurringId: flow.recurringId,
        date: flow.date,
        description: rule.description,
        category: rule.category,
        amount: flow.amount,
        ...(flow.counterpartId !== undefined && {
          counterpartId: flow.counterpartId,
        }),
        ...(flow.side !== undefined && { side: flow.side }),
        inAnchor: false,
      });
    }
    flows.sort((a, b) => a.date.localeCompare(b.date));
    return { accountId: account.id, flows };
  });

  return { month, accounts: groups };
}
