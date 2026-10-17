import type {
  Account,
  RecurringTransaction,
  Transaction,
} from "../../storage/types.js";
import type {
  AppliedSettlement,
  MonthlyProjection,
} from "../projection/projection.js";
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
export interface RecurringFixedFlow {
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
  side: "source" | "destination";
  inAnchor: boolean;
}

export type FixedFlow = RecurringFixedFlow | SettlementFixedFlow;

const SETTLEMENT_DESCRIPTION = "Auto-settlement";
const SETTLEMENT_CATEGORY = "Transfer";

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
 * not cover yields empty groups. CreditCard settlements are listed on both the
 * card and its funding account: the stored auto-settlements up to and
 * including `currentMonth`, the engine's projected ones after it.
 */
export function deriveMonthCashFlow(
  month: string,
  projected: MonthlyProjection[],
  accounts: Account[],
  recurrings: RecurringTransaction[],
  transactions: Transaction[],
  currentMonth: string
): MonthCashFlowReport {
  const rules = new Map(recurrings.map((r) => [r.id, r]));
  const run = projected.find((m) => m.month === month);
  const applied = run?.flows ?? [];
  const settlements =
    month <= currentMonth
      ? storedSettlements(month, transactions)
      : projectedSettlements(run?.settlements ?? []);
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
    flows.push(...(settlements.get(account.id) ?? []));
    flows.sort((a, b) => a.date.localeCompare(b.date));
    return { accountId: account.id, flows };
  });

  return { month, accounts: groups };
}

function settlementLeg(
  date: string,
  amount: number,
  counterpartId: string,
  side: "source" | "destination"
): SettlementFixedFlow {
  return {
    kind: "settlement",
    date,
    description: SETTLEMENT_DESCRIPTION,
    category: SETTLEMENT_CATEGORY,
    amount,
    counterpartId,
    side,
    inAnchor: false,
  };
}

function addTo(
  byAccount: Map<string, SettlementFixedFlow[]>,
  accountId: string,
  flow: SettlementFixedFlow
): void {
  const list = byAccount.get(accountId) ?? [];
  list.push(flow);
  byAccount.set(accountId, list);
}

/**
 * The stored auto-settlements dated in `month`, per account: each leg names
 * the account of its paired leg (same transferId) as its counterpart. The
 * funding account's outgoing leg is the source side.
 */
function storedSettlements(
  month: string,
  transactions: Transaction[]
): Map<string, SettlementFixedFlow[]> {
  const legs = transactions.filter(
    (t) => t.isAutoSettlement && t.date.slice(0, 7) === month
  );
  const byAccount = new Map<string, SettlementFixedFlow[]>();
  for (const leg of legs) {
    const pair = legs.find(
      (t) =>
        t.id !== leg.id &&
        t.transferId !== undefined &&
        t.transferId === leg.transferId
    );
    if (!pair) continue;
    addTo(
      byAccount,
      leg.accountId,
      settlementLeg(
        leg.date,
        leg.amount,
        pair.accountId,
        leg.amount < 0 ? "source" : "destination"
      )
    );
  }
  return byAccount;
}

/** The engine's projected settlements in the month, per account. */
function projectedSettlements(
  settlements: AppliedSettlement[]
): Map<string, SettlementFixedFlow[]> {
  const byAccount = new Map<string, SettlementFixedFlow[]>();
  for (const s of settlements) {
    addTo(
      byAccount,
      s.fundingAccountId,
      settlementLeg(s.date, -s.amount, s.cardId, "source")
    );
    addTo(
      byAccount,
      s.cardId,
      settlementLeg(s.date, s.amount, s.fundingAccountId, "destination")
    );
  }
  return byAccount;
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
): Map<string, RecurringFixedFlow[]> {
  const byId = new Map(accounts.map((a) => [a.id, a]));
  const blocked = new Map<string, RecurringFixedFlow[]>();

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
