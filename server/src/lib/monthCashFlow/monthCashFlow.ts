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
  occurrenceLegs,
  sourceAnchorMonth,
  type TransferSide,
} from "../recurringOccurrence/recurringOccurrence.js";
import {
  SETTLEMENT_CATEGORY,
  SETTLEMENT_DESCRIPTION,
} from "../settlement/settlement.js";

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
  side: TransferSide
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

  for (const rule of recurrings) {
    const anchorMonth = sourceAnchorMonth(rule, byId, runStart);
    if (!firesInMonth(rule, month, anchorMonth)) continue;
    const date = occurrenceDate(month, rule.dayOfMonth);
    // The report keeps no Restschuld: a blocked leg is listed at its full
    // magnitude.
    const legs = occurrenceLegs(rule, date, byId, () => Infinity);
    for (const leg of legs) {
      // Listed as In Balance Anchor when the gate holds the leg back and its
      // account is anchored this month.
      if (leg.passesGate) continue;
      if (byId.get(leg.accountId)?.anchorDate.slice(0, 7) !== month) continue;
      const list = blocked.get(leg.accountId) ?? [];
      list.push({
        kind: "recurring",
        recurringId: rule.id,
        date,
        description: rule.description,
        category: rule.category,
        amount: leg.amount,
        ...(leg.counterpartId !== undefined && {
          counterpartId: leg.counterpartId,
        }),
        ...(leg.side !== undefined && { side: leg.side }),
        inAnchor: true,
      });
      blocked.set(leg.accountId, list);
    }
  }
  return blocked;
}
