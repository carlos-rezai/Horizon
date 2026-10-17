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
 * A stored Recurring Transaction as the engine's recurring entry: the
 * account, amount and schedule, plus the transfer link and the annual month
 * only when they are set.
 */
export function toProjectionRecurringEntry(
  r: RecurringTransaction
): ProjectionRecurringEntry {
  return {
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

function applyRecurringToBalances(
  r: ProjectionRecurringEntry,
  month: string,
  accountMap: Map<string, ProjectionAccountEntry>,
  runningBalances: Map<string, number>
): void {
  const date = occurrenceDate(month, r.dayOfMonth);
  const sourceMoves = accountPassesAnchorGate(r.accountId, date, accountMap);

  if (r.linkedAccountId) {
    const destMoves = accountPassesAnchorGate(
      r.linkedAccountId,
      date,
      accountMap
    );
    const destKind = accountMap.get(r.linkedAccountId)?.kind;
    if (destKind === "Mortgage" && destMoves) {
      const remaining = runningBalances.get(r.linkedAccountId) ?? 0;
      // Operate on the magnitude so the paydown matches every other transfer's
      // sign convention: a transfer stored with the domain's negative outflow
      // sign reduces Restschuld identically to a positive-amount transfer.
      const actualDebit = Math.min(Math.abs(r.amount), remaining);
      if (actualDebit > 0) {
        if (sourceMoves) {
          runningBalances.set(
            r.accountId,
            (runningBalances.get(r.accountId) ?? 0) - actualDebit
          );
        }
        runningBalances.set(r.linkedAccountId, remaining - actualDebit);
      }
      return;
    }
    if (sourceMoves) {
      // A Mortgage leg behind its anchor still debits the payment's magnitude.
      const debit = destKind === "Mortgage" ? Math.abs(r.amount) : r.amount;
      runningBalances.set(
        r.accountId,
        (runningBalances.get(r.accountId) ?? 0) - debit
      );
    }
    if (destMoves && destKind !== "Mortgage") {
      runningBalances.set(
        r.linkedAccountId,
        (runningBalances.get(r.linkedAccountId) ?? 0) + r.amount
      );
    }
    return;
  }
  const kind = accountMap.get(r.accountId)?.kind;
  if (kind !== "Mortgage" && sourceMoves) {
    runningBalances.set(
      r.accountId,
      (runningBalances.get(r.accountId) ?? 0) + r.amount
    );
  }
}

export function projectBalances(
  accounts: ProjectionAccountEntry[],
  transactions: ProjectionTxEntry[],
  recurringTransactions: ProjectionRecurringEntry[],
  fromDate: string,
  currentDate: string,
  months: number = DEFAULT_PROJECTION_MONTHS
): MonthlySnapshot[] {
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

  const snapshots: MonthlySnapshot[] = [];

  // Pending CC settlement to apply at the start of the next month.
  // Key: CC account ID → { giroId, amount (positive cents to deduct from giro) }
  type PendingSettlement = { giroId: string; amount: number };
  const pendingSettlements = new Map<string, PendingSettlement>();

  for (let i = 0; i < months; i++) {
    const month = addMonths(fromDate, i);

    let netCashflow = 0;

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

      applyRecurringToBalances(r, month, accountMap, runningBalances);

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
    });
  }

  return snapshots;
}
