import type { AccountKind } from "../storage/types.js";
import type { Frequency } from "../storage/types.js";

export interface ProjectionAccountEntry {
  id: string;
  kind: AccountKind;
  openingBalance: number;
  openingDate?: string;
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

function monthsBetween(from: string, to: string): number {
  const [fy, fm] = from.split("-").map(Number);
  const [ty, tm] = to.split("-").map(Number);
  return (ty - fy) * 12 + (tm - fm);
}

function firesInMonth(
  frequency: Frequency,
  index: number,
  calendarMonth: number,
  monthOfYear?: number
): boolean {
  if (frequency === "monthly") return true;

  if (monthOfYear != null) {
    if (frequency === "annual") {
      return calendarMonth === monthOfYear;
    }
    // Quarterly calendar-aware: fire when the calendar month is in the 3-month
    // cycle anchored at monthOfYear. At index 0, only fire if this IS the anchor
    // month — don't fire mid-cycle at the projection start.
    const distance = (calendarMonth - monthOfYear + 12) % 12;
    return distance % 3 === 0 && (distance === 0 || index > 0);
  }

  // Legacy offset-based firing when monthOfYear is not set
  if (frequency === "quarterly") return index % 3 === 0;
  return index % 12 === 0; // annual
}

function applyRecurringToBalances(
  r: ProjectionRecurringEntry,
  accountMap: Map<string, ProjectionAccountEntry>,
  runningBalances: Map<string, number>
): void {
  if (r.linkedAccountId) {
    runningBalances.set(
      r.accountId,
      (runningBalances.get(r.accountId) ?? 0) - r.amount
    );
    const destKind = accountMap.get(r.linkedAccountId)?.kind;
    if (destKind === "Mortgage") {
      const remaining = runningBalances.get(r.linkedAccountId) ?? 0;
      const actualDebit = Math.min(r.amount, remaining);
      if (actualDebit <= 0) {
        runningBalances.set(
          r.accountId,
          (runningBalances.get(r.accountId) ?? 0) + r.amount
        );
      } else {
        runningBalances.set(
          r.accountId,
          (runningBalances.get(r.accountId) ?? 0) + r.amount - actualDebit
        );
        runningBalances.set(r.linkedAccountId, remaining - actualDebit);
      }
    } else {
      runningBalances.set(
        r.linkedAccountId,
        (runningBalances.get(r.linkedAccountId) ?? 0) + r.amount
      );
    }
  } else {
    const kind = accountMap.get(r.accountId)?.kind;
    if (kind !== "Mortgage") {
      runningBalances.set(
        r.accountId,
        (runningBalances.get(r.accountId) ?? 0) + r.amount
      );
    }
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

  // Initialise from opening balances
  const runningBalances = new Map<string, number>();
  for (const a of accounts) {
    runningBalances.set(a.id, a.openingBalance);
  }

  // Replay Loop: replay each account's recurring history from its Opening Date
  // up to (but not including) fromDate, using the same calendar-aware firing logic
  const replayStart = accounts.reduce((earliest, a) => {
    const od = a.openingDate ? a.openingDate.slice(0, 7) : fromDate;
    return od < earliest ? od : earliest;
  }, fromDate);

  const replayLength = monthsBetween(replayStart, fromDate);
  for (let j = 0; j < replayLength; j++) {
    const replayMonth = addMonths(replayStart, j);
    const replayCalendarMonth = parseInt(replayMonth.split("-")[1], 10);

    for (const r of activeRecurring) {
      const sourceOpened =
        accountMap.get(r.accountId)?.openingDate?.slice(0, 7) ?? fromDate;
      if (replayMonth < sourceOpened) continue;

      const indexFromOpening = monthsBetween(sourceOpened, replayMonth);
      if (
        !firesInMonth(
          r.frequency,
          indexFromOpening,
          replayCalendarMonth,
          r.monthOfYear
        )
      )
        continue;

      applyRecurringToBalances(r, accountMap, runningBalances);
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

  const snapshots: MonthlySnapshot[] = [];

  for (let i = 0; i < months; i++) {
    const month = addMonths(fromDate, i);
    const calendarMonth = parseInt(month.split("-")[1], 10);

    let netCashflow = 0;

    for (const r of activeRecurring) {
      if (!firesInMonth(r.frequency, i, calendarMonth, r.monthOfYear)) continue;

      applyRecurringToBalances(r, accountMap, runningBalances);

      // Transfers are excluded from netCashflow; Mortgage accounts are never
      // directly credited by a non-transfer recurring
      if (
        !r.linkedAccountId &&
        accountMap.get(r.accountId)?.kind !== "Mortgage"
      ) {
        netCashflow += r.amount;
      }
    }

    const totalLiquid = accounts
      .filter((a) => a.kind === "Girokonto" || a.kind === "Tagesgeld")
      .reduce((sum, a) => sum + (runningBalances.get(a.id) ?? 0), 0);

    const accountsSnapshot: Record<string, AccountSnapshot> = {};
    for (const a of accounts) {
      const snapshot: AccountSnapshot = {
        projected: runningBalances.get(a.id) ?? 0,
      };

      if (month <= currentDate) {
        snapshot.actual =
          a.openingBalance +
          transactions
            .filter(
              (tx) => tx.accountId === a.id && tx.date.slice(0, 7) <= month
            )
            .reduce((sum, tx) => sum + tx.amount, 0);
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
        runningBalances.set(
          a.id,
          a.openingBalance +
            transactions
              .filter(
                (tx) => tx.accountId === a.id && tx.date.slice(0, 7) <= month
              )
              .reduce((sum, tx) => sum + tx.amount, 0)
        );
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
