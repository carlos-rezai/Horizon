import type {
  Account,
  AccountKind,
  RecurringTransaction,
  Transaction,
} from "../../storage/types.js";
import type { Frequency } from "../../storage/types.js";
import { balanceAt, knownSince } from "../balanceAnchor/balanceAnchor.js";
import { endOfMonth, monthsBetween } from "../date/date.js";
import {
  firesInMonth,
  occurrenceDate,
  passesAnchorGate,
} from "../recurringOccurrence/recurringOccurrence.js";
import { selectLiquidAccounts } from "../accountKinds/accountKinds.js";

export interface ProjectionAccountEntry {
  id: string;
  kind: AccountKind;
  anchorBalance: number;
  anchorDate?: string;
  linkedAccountId?: string;
  settlementDay?: number;
  linkedSince?: string;
}

/**
 * A stored Account as the engine's account entry: the id, kind and both
 * anchor fields, plus the settlement link fields only when they are set.
 */
export function toProjectionAccountEntry(
  account: Account
): ProjectionAccountEntry {
  return {
    id: account.id,
    kind: account.kind,
    anchorBalance: account.anchorBalance,
    anchorDate: account.anchorDate,
    ...(account.linkedAccountId != null && {
      linkedAccountId: account.linkedAccountId,
    }),
    ...(account.settlementDay != null && {
      settlementDay: account.settlementDay,
    }),
    ...(account.linkedSince != null && { linkedSince: account.linkedSince }),
  };
}

export interface ProjectionTxEntry {
  accountId: string;
  date: string;
  amount: number;
}

export interface ProjectionRecurringEntry {
  /** The rule's id, which its applied flows report. */
  id?: string;
  accountId: string;
  amount: number;
  frequency: Frequency;
  dayOfMonth: number;
  linkedAccountId?: string;
  monthOfYear?: number;
  isActive?: boolean;
}

/**
 * A stored Transaction as the engine's transaction entry: the account, date
 * and amount — nothing the engine does not read.
 */
export function toProjectionTxEntry(tx: Transaction): ProjectionTxEntry {
  return { accountId: tx.accountId, date: tx.date, amount: tx.amount };
}

/**
 * A stored Recurring Transaction as the engine's recurring entry: the rule's
 * id, the account, amount and schedule, plus the transfer link and the annual month
 * only when they are set.
 */
export function toProjectionRecurringEntry(
  r: RecurringTransaction
): ProjectionRecurringEntry {
  return {
    id: r.id,
    accountId: r.accountId,
    amount: r.amount,
    frequency: r.frequency,
    dayOfMonth: r.dayOfMonth,
    ...(r.linkedAccountId !== undefined && {
      linkedAccountId: r.linkedAccountId,
    }),
    ...(r.monthOfYear !== undefined && { monthOfYear: r.monthOfYear }),
  };
}

interface AccountSnapshot {
  projected: number;
  actual?: number;
}

export interface MonthlySnapshot {
  month: string;
  accounts: Record<string, AccountSnapshot>;
  netCashflow: number;
  totalLiquid: number;
}

/**
 * One recurring leg the engine applied to an account in a month: the rule's
 * id, the leg's date and its signed amount for that account. A transfer leg
 * names its counterpart account and which side of the transfer it is.
 */
export interface AppliedFlow {
  recurringId: string;
  accountId: string;
  date: string;
  amount: number;
  counterpartId?: string;
  side?: "source" | "destination";
}

/** A monthly snapshot plus the recurring flows applied in that month. */
export interface MonthlyProjection extends MonthlySnapshot {
  flows: AppliedFlow[];
}

const DEFAULT_PROJECTION_MONTHS = 240;

function addMonths(yyyyMM: string, n: number): string {
  const [yearStr, monthStr] = yyyyMM.split("-");
  const totalMonths =
    parseInt(yearStr, 10) * 12 + (parseInt(monthStr, 10) - 1) + n;
  const year = Math.floor(totalMonths / 12);
  const month = (totalMonths % 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

// The account's Anchor Gate, looked up by id.
function accountPassesAnchorGate(
  accountId: string,
  date: string,
  accountMap: Map<string, ProjectionAccountEntry>
): boolean {
  return passesAnchorGate(accountMap.get(accountId)?.anchorDate, date);
}

// Applies one firing of a rule to the running balances and returns the legs
// that moved an account.
function applyRecurringToBalances(
  r: ProjectionRecurringEntry,
  month: string,
  accountMap: Map<string, ProjectionAccountEntry>,
  runningBalances: Map<string, number>
): AppliedFlow[] {
  const date = occurrenceDate(month, r.dayOfMonth);
  const sourceMoves = accountPassesAnchorGate(r.accountId, date, accountMap);
  const flows: AppliedFlow[] = [];
  const move = (
    accountId: string,
    amount: number,
    transfer?: { counterpartId: string; side: "source" | "destination" }
  ): void => {
    runningBalances.set(
      accountId,
      (runningBalances.get(accountId) ?? 0) + amount
    );
    flows.push({
      recurringId: r.id ?? "",
      accountId,
      date,
      amount,
      ...transfer,
    });
  };

  if (r.linkedAccountId) {
    const destId = r.linkedAccountId;
    const destMoves = accountPassesAnchorGate(destId, date, accountMap);
    const destKind = accountMap.get(destId)?.kind;
    const source = { counterpartId: destId, side: "source" as const };
    const destination = {
      counterpartId: r.accountId,
      side: "destination" as const,
    };
    if (destKind === "Mortgage" && destMoves) {
      const remaining = runningBalances.get(destId) ?? 0;
      // Operate on the magnitude so the paydown matches every other transfer's
      // sign convention: a transfer stored with the domain's negative outflow
      // sign reduces Restschuld identically to a positive-amount transfer.
      const actualDebit = Math.min(Math.abs(r.amount), remaining);
      if (actualDebit > 0) {
        if (sourceMoves) move(r.accountId, -actualDebit, source);
        // The Restschuld is a positive balance the repayment pays down; the
        // leg is reported as the inflow it is to the Mortgage.
        runningBalances.set(destId, remaining - actualDebit);
        flows.push({
          recurringId: r.id ?? "",
          accountId: destId,
          date,
          amount: actualDebit,
          ...destination,
        });
      }
      return flows;
    }
    if (sourceMoves) {
      // A Mortgage leg behind its anchor still debits the payment's magnitude.
      const debit = destKind === "Mortgage" ? Math.abs(r.amount) : r.amount;
      move(r.accountId, -debit, source);
    }
    if (destMoves && destKind !== "Mortgage") {
      move(destId, r.amount, destination);
    }
    return flows;
  }
  const kind = accountMap.get(r.accountId)?.kind;
  if (kind !== "Mortgage" && sourceMoves) move(r.accountId, r.amount);
  return flows;
}

export function projectBalances(
  accounts: ProjectionAccountEntry[],
  transactions: ProjectionTxEntry[],
  recurringTransactions: ProjectionRecurringEntry[],
  fromDate: string,
  currentDate: string,
  months: number = DEFAULT_PROJECTION_MONTHS
): MonthlySnapshot[] {
  return projectMonths(
    accounts,
    transactions,
    recurringTransactions,
    fromDate,
    currentDate,
    months
  ).map(
    ({
      month,
      accounts: balances,
      netCashflow,
      totalLiquid,
    }): MonthlySnapshot => ({
      month,
      accounts: balances,
      netCashflow,
      totalLiquid,
    })
  );
}

/**
 * The projection run: each monthly snapshot plus the recurring flows applied
 * in that month. `projectBalances` is this run with the flows dropped.
 */
export function projectMonths(
  accounts: ProjectionAccountEntry[],
  transactions: ProjectionTxEntry[],
  recurringTransactions: ProjectionRecurringEntry[],
  fromDate: string,
  currentDate: string,
  months: number = DEFAULT_PROJECTION_MONTHS
): MonthlyProjection[] {
  const accountMap = new Map<string, ProjectionAccountEntry>();
  for (const a of accounts) accountMap.set(a.id, a);

  const activeRecurring = recurringTransactions.filter(
    (r) => r.isActive !== false
  );

  // A rule's source account's Anchor month; without an Anchor Date, the run's
  // first month.
  const sourceAnchorMonth = (r: ProjectionRecurringEntry): string =>
    accountMap.get(r.accountId)?.anchorDate?.slice(0, 7) ?? fromDate;

  // Initialise from Anchor Balances
  const runningBalances = new Map<string, number>();
  for (const a of accounts) {
    runningBalances.set(a.id, a.anchorBalance);
  }

  // Replay Loop: replay each account's recurring history from its Anchor Date
  // up to (but not including) fromDate, using the same calendar-aware firing logic
  const replayStart = accounts.reduce((earliest, a) => {
    const od = a.anchorDate ? a.anchorDate.slice(0, 7) : fromDate;
    return od < earliest ? od : earliest;
  }, fromDate);

  const replayLength = monthsBetween(replayStart, fromDate);
  for (let j = 0; j < replayLength; j++) {
    const replayMonth = addMonths(replayStart, j);

    for (const r of activeRecurring) {
      const sourceOpened = sourceAnchorMonth(r);
      if (replayMonth < sourceOpened) continue;
      if (!firesInMonth(r, replayMonth, sourceOpened)) continue;

      applyRecurringToBalances(r, replayMonth, accountMap, runningBalances);
    }
  }

  // Add Variable Spending actual transactions recorded before fromDate
  for (const a of accounts) {
    const variableSpending = transactions
      .filter((tx) => tx.accountId === a.id && tx.date.slice(0, 7) < fromDate)
      .reduce((sum, tx) => sum + tx.amount, 0);
    runningBalances.set(
      a.id,
      (runningBalances.get(a.id) ?? 0) + variableSpending
    );
  }

  // Each account's balance at the end of a month comes from its Balance
  // Anchor. Without an Anchor Date the anchor precedes every transaction, so
  // the balance is known from the start.
  const anchored = new Map<
    string,
    { endOf: (month: string) => number; knownMonth: string }
  >();
  for (const a of accounts) {
    const accountTx = transactions.filter((tx) => tx.accountId === a.id);
    const anchor = {
      anchorBalance: a.anchorBalance,
      anchorDate: a.anchorDate ?? "",
    };
    anchored.set(a.id, {
      endOf: (month) => balanceAt(anchor, accountTx, endOfMonth(month)),
      knownMonth: a.anchorDate ? knownSince(anchor, accountTx).slice(0, 7) : "",
    });
  }

  const snapshots: MonthlyProjection[] = [];

  // Pending CC settlement to apply at the start of the next month.
  // Key: CC account ID → { giroId, amount (positive cents to deduct from giro) }
  type PendingSettlement = { giroId: string; amount: number };
  const pendingSettlements = new Map<string, PendingSettlement>();

  for (let i = 0; i < months; i++) {
    const month = addMonths(fromDate, i);

    let netCashflow = 0;
    const flows: AppliedFlow[] = [];

    // Apply settlements queued from the previous month BEFORE variable spending
    // for this month (month M+1 settlement depends on month M CC closing balance;
    // variable spending for month M must be applied before that check).
    for (const [ccId, { giroId, amount }] of pendingSettlements) {
      runningBalances.set(giroId, (runningBalances.get(giroId) ?? 0) - amount);
      runningBalances.set(ccId, 0);
      netCashflow -= amount;
    }
    pendingSettlements.clear();

    for (const r of activeRecurring) {
      if (!firesInMonth(r, month, sourceAnchorMonth(r))) continue;

      flows.push(
        ...applyRecurringToBalances(r, month, accountMap, runningBalances)
      );

      // Transfers are excluded from netCashflow; Mortgage accounts are never
      // directly credited by a non-transfer recurring
      if (
        !r.linkedAccountId &&
        accountMap.get(r.accountId)?.kind !== "Mortgage"
      ) {
        netCashflow += r.amount;
      }
    }

    const totalLiquid = selectLiquidAccounts(accounts).reduce(
      (sum, a) => sum + (runningBalances.get(a.id) ?? 0),
      0
    );

    const accountsSnapshot: Record<string, AccountSnapshot> = {};
    for (const a of accounts) {
      const snapshot: AccountSnapshot = {
        projected: runningBalances.get(a.id) ?? 0,
      };

      if (month <= currentDate) {
        const balance = anchored.get(a.id);
        if (balance && month >= balance.knownMonth) {
          snapshot.actual = balance.endOf(month);
        }
      }

      accountsSnapshot[a.id] = snapshot;
    }

    // Re-anchor non-mortgage running balances to actual after each current/past
    // month so future projections build from the real balance, not the projected
    // one (which would double-count recurring transfers already implicit in the
    // actual balance).
    if (month <= currentDate) {
      for (const a of accounts) {
        if (a.kind === "Mortgage") continue;
        const balance = anchored.get(a.id);
        if (balance) runningBalances.set(a.id, balance.endOf(month));
      }
    }

    // After variable spending and optional re-anchoring, check each linked
    // CreditCard's closing balance. If negative, queue a settlement for the
    // next month (no DB writes — projection only).
    for (const a of accounts) {
      if (a.kind !== "CreditCard") continue;
      if (!a.linkedAccountId || !a.settlementDay || !a.linkedSince) continue;
      const ccBalance = runningBalances.get(a.id) ?? 0;
      if (ccBalance < 0) {
        pendingSettlements.set(a.id, {
          giroId: a.linkedAccountId,
          amount: -ccBalance,
        });
      }
    }

    snapshots.push({
      month,
      accounts: accountsSnapshot,
      netCashflow,
      totalLiquid,
      flows,
    });
  }

  return snapshots;
}
