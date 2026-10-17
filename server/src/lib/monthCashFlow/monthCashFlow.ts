import type { Account, RecurringTransaction } from "../../storage/types.js";
import type { MonthlyProjection } from "../projection/projection.js";
import {
  firesInMonth,
  occurrenceDate,
  passesAnchorGate,
} from "../recurringOccurrence/recurringOccurrence.js";

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
 * to it that month, ordered by date. In an account's anchor month the legs the
 * Anchor Gate blocked are listed too, marked `inAnchor`. A month the run does
 * not cover yields empty groups.
 */
export function deriveMonthCashFlow(
  month: string,
  projected: MonthlyProjection[],
  accounts: Account[],
  recurrings: RecurringTransaction[]
): MonthCashFlowReport {
  const rules = new Map(recurrings.map((r) => [r.id, r]));
  const applied = projected.find((m) => m.month === month)?.flows ?? [];
  const blocked = blockedAnchorLegs(
    month,
    projected[0]?.month ?? month,
    accounts,
    recurrings
  );

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
    flows.push(...(blocked.get(account.id) ?? []));
    flows.sort((a, b) => a.date.localeCompare(b.date));
    return { accountId: account.id, flows };
  });

  return { month, accounts: groups };
}

/**
 * The legs the Anchor Gate kept out of the run in `month`, per account: only
 * an account whose Anchor Date falls in `month` has any — before its anchor
 * month its history comes from its statements, after it every leg passes.
 */
function blockedAnchorLegs(
  month: string,
  runStart: string,
  accounts: Account[],
  recurrings: RecurringTransaction[]
): Map<string, FixedFlow[]> {
  const byId = new Map(accounts.map((a) => [a.id, a]));
  const blocked = new Map<string, FixedFlow[]>();

  // A leg is listed as In Balance Anchor when its account is anchored this
  // month and the gate holds it back.
  const isBlocked = (accountId: string, date: string): boolean => {
    const anchorDate = byId.get(accountId)?.anchorDate;
    return (
      !!anchorDate &&
      anchorDate.slice(0, 7) === month &&
      !passesAnchorGate(anchorDate, date)
    );
  };
  const add = (
    accountId: string,
    rule: RecurringTransaction,
    date: string,
    amount: number,
    transfer?: { counterpartId: string; side: "source" | "destination" }
  ): void => {
    const list = blocked.get(accountId) ?? [];
    list.push({
      kind: "recurring",
      recurringId: rule.id,
      date,
      description: rule.description,
      category: rule.category,
      amount,
      ...transfer,
      inAnchor: true,
    });
    blocked.set(accountId, list);
  };

  for (const rule of recurrings) {
    const sourceAnchorMonth =
      byId.get(rule.accountId)?.anchorDate?.slice(0, 7) || runStart;
    if (!firesInMonth(rule, month, sourceAnchorMonth)) continue;
    const date = occurrenceDate(month, rule.dayOfMonth);
    const sourceKind = byId.get(rule.accountId)?.kind;

    if (rule.linkedAccountId) {
      const destId = rule.linkedAccountId;
      const destIsMortgage = byId.get(destId)?.kind === "Mortgage";
      const magnitude = destIsMortgage ? Math.abs(rule.amount) : rule.amount;
      if (isBlocked(rule.accountId, date)) {
        add(rule.accountId, rule, date, -magnitude, {
          counterpartId: destId,
          side: "source",
        });
      }
      if (isBlocked(destId, date)) {
        add(destId, rule, date, magnitude, {
          counterpartId: rule.accountId,
          side: "destination",
        });
      }
      continue;
    }
    if (sourceKind !== "Mortgage" && isBlocked(rule.accountId, date)) {
      add(rule.accountId, rule, date, rule.amount);
    }
  }
  return blocked;
}
