import type { AccountKind } from "../models/Account.js";
import type { Frequency } from "../models/RecurringTransaction.js";

export interface ProjectionAccountEntry {
  _id: string;
  kind: AccountKind;
  openingBalance: number;
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
  isActive: boolean;
  linkedAccountId?: string;
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

const PROJECTION_MONTHS = 120;

function addMonths(yyyyMM: string, n: number): string {
  const [yearStr, monthStr] = yyyyMM.split("-");
  const totalMonths =
    parseInt(yearStr, 10) * 12 + (parseInt(monthStr, 10) - 1) + n;
  const year = Math.floor(totalMonths / 12);
  const month = (totalMonths % 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

function firesInMonth(frequency: Frequency, index: number): boolean {
  if (frequency === "monthly") return true;
  if (frequency === "quarterly") return index % 3 === 0;
  return index % 12 === 0; // annual
}

export function projectBalances(
  accounts: ProjectionAccountEntry[],
  transactions: ProjectionTxEntry[],
  recurringTransactions: ProjectionRecurringEntry[],
  fromDate: string,
  currentDate: string
): MonthlySnapshot[] {
  const accountMap = new Map<string, ProjectionAccountEntry>();
  for (const a of accounts) accountMap.set(a._id, a);

  const activeRecurring = recurringTransactions.filter((r) => r.isActive);

  // Projection starts from opening balance + any transactions before fromDate
  const runningBalances = new Map<string, number>();
  for (const a of accounts) {
    const priorSum = transactions
      .filter((tx) => tx.accountId === a._id && tx.date.slice(0, 7) < fromDate)
      .reduce((sum, tx) => sum + tx.amount, 0);
    runningBalances.set(a._id, a.openingBalance + priorSum);
  }

  const snapshots: MonthlySnapshot[] = [];

  for (let i = 0; i < PROJECTION_MONTHS; i++) {
    const month = addMonths(fromDate, i);

    let netCashflow = 0;

    for (const r of activeRecurring) {
      if (!firesInMonth(r.frequency, i)) continue;

      if (r.linkedAccountId) {
        // Transfer: debit source
        runningBalances.set(
          r.accountId,
          (runningBalances.get(r.accountId) ?? 0) - r.amount
        );

        const destKind = accountMap.get(r.linkedAccountId)?.kind;
        if (destKind === "Mortgage") {
          // Sondertilgung: reduces outstanding debt
          runningBalances.set(
            r.linkedAccountId,
            (runningBalances.get(r.linkedAccountId) ?? 0) - r.amount
          );
        } else {
          // Regular transfer: credit destination
          runningBalances.set(
            r.linkedAccountId,
            (runningBalances.get(r.linkedAccountId) ?? 0) + r.amount
          );
        }
        // Transfers excluded from netCashflow
      } else {
        // Regular recurring: only affects its own account
        // Mortgage accounts are never directly modified by a non-transfer RT
        const kind = accountMap.get(r.accountId)?.kind;
        if (kind !== "Mortgage") {
          runningBalances.set(
            r.accountId,
            (runningBalances.get(r.accountId) ?? 0) + r.amount
          );
          netCashflow += r.amount;
        }
      }
    }

    const totalLiquid = accounts
      .filter((a) => a.kind === "Girokonto" || a.kind === "Tagesgeld")
      .reduce((sum, a) => sum + (runningBalances.get(a._id) ?? 0), 0);

    const accountsSnapshot: Record<string, AccountSnapshot> = {};
    for (const a of accounts) {
      const snapshot: AccountSnapshot = {
        projected: runningBalances.get(a._id) ?? 0,
      };

      if (month <= currentDate) {
        snapshot.actual =
          a.openingBalance +
          transactions
            .filter(
              (tx) => tx.accountId === a._id && tx.date.slice(0, 7) <= month
            )
            .reduce((sum, tx) => sum + tx.amount, 0);
      }

      accountsSnapshot[a._id] = snapshot;
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
