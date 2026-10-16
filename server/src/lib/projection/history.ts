import type { AccountKind } from "../../storage/types.js";
import type { MonthlySnapshot } from "./projection.js";
import { monthsBetween } from "../date/date.js";
import {
  selectLiquidAccounts,
  selectTrackableAccounts,
} from "../accountKinds/accountKinds.js";
import {
  isVariableSpending,
  selectSpendingAccounts,
} from "../variableSpending/variableSpending.js";

/**
 * A single reconstructed month on the History view. All monetary values are
 * integer cents.
 */
export interface HistoryPoint {
  /** "YYYY-MM" */
  month: string;
  /**
   * Σ of the liquid accounts' `actual` balances known that month (a partial
   * sum when some are Unknown); null when no liquid account is known.
   */
  totalLiquid: number | null;
  /**
   * The mortgage's replayed `projected` balance (0 when there is no mortgage);
   * null before the Mortgage's Known Since.
   */
  restschuld: number | null;
  /**
   * The Paydown Bridge: a straight line in cents from the Original Principal in
   * the Mortgage Start month to the Restschuld in the Mortgage's first known
   * month (inclusive). Null everywhere else; never written into `restschuld`.
   */
  restschuldBridge: number | null;
  /** Σ of that month's real stored transactions (not the recurring figure). */
  netCashflow: number;
  /**
   * Monthly Savings: Σ of the month-over-month gains of the Trackable Accounts
   * (Girokonto, Tagesgeld, Investment). Null in the span's first month and when
   * any Trackable Account is Unknown that month or the month before.
   */
  monthlySavings: number | null;
  /**
   * Monthly Spending: the magnitude of the month's Variable Spending outflows
   * on the spending accounts (the Month Year-Comparison rule). Null when no
   * spending account is known that month; a real 0 in a known month with none.
   */
  monthlySpending: number | null;
  /** Per-account `actual` balance; null before that account's Known Since. */
  accounts: Record<string, number | null>;
}

/** The minimal shape `deriveHistory` needs from a stored transaction. */
export interface HistoryTx {
  accountId: string;
  date: string;
  amount: number;
  transferId?: string;
  isAutoSettlement?: boolean;
}

/** The minimal shape `deriveHistory` needs from an account. */
export interface HistoryAccount {
  id: string;
  kind: AccountKind;
  /** The Mortgage's Original Principal in cents, when originated. */
  originalPrincipal?: number;
  /** The Mortgage Start date (ISO), when originated. */
  startDate?: string;
}

/**
 * The Paydown Bridge value per month ("YYYY-MM" to cents), or an empty map
 * when there is no Mortgage, no origination, no known month, or the Mortgage
 * Start month is not earlier than the Mortgage's first known month.
 */
function paydownBridge(
  snapshots: MonthlySnapshot[],
  mortgage: HistoryAccount | undefined
): Map<string, number> {
  const bridge = new Map<string, number>();
  if (
    !mortgage ||
    mortgage.originalPrincipal === undefined ||
    mortgage.startDate === undefined
  ) {
    return bridge;
  }

  const firstKnown = snapshots.find(
    (s) => s.accounts[mortgage.id]?.actual !== undefined
  );
  const startMonth = mortgage.startDate.slice(0, 7);
  if (!firstKnown || startMonth >= firstKnown.month) return bridge;

  const principal = mortgage.originalPrincipal;
  const end = firstKnown.accounts[mortgage.id].projected;
  const steps = monthsBetween(startMonth, firstKnown.month);
  for (const snapshot of snapshots) {
    if (snapshot.month < startMonth || snapshot.month > firstKnown.month) {
      continue;
    }
    const step = monthsBetween(startMonth, snapshot.month);
    bridge.set(
      snapshot.month,
      Math.round(principal + ((end - principal) * step) / steps)
    );
  }
  return bridge;
}

/**
 * Maps the projection engine's snapshots + the real stored transactions +
 * account kinds into `HistoryPoint[]`. No new balance math: cash lines read
 * each account's `actual` snapshot balance, Restschuld reads the mortgage's
 * replayed `projected` balance, and `netCashflow` is summed from the real
 * stored transactions in the month — deliberately not the recurring/projected
 * `netCashflow` the snapshot carries.
 */
export function deriveHistory(
  snapshots: MonthlySnapshot[],
  transactions: HistoryTx[],
  accounts: HistoryAccount[]
): HistoryPoint[] {
  const mortgage = accounts.find((a) => a.kind === "Mortgage");
  const liquidIds = selectLiquidAccounts(accounts).map((a) => a.id);
  const trackableIds = selectTrackableAccounts(accounts).map((a) => a.id);
  const spendingIds = new Set(
    selectSpendingAccounts(accounts).map((a) => a.id)
  );
  const bridge = paydownBridge(snapshots, mortgage);

  const monthlySpendingAt = (snapshot: MonthlySnapshot): number | null => {
    const known = [...spendingIds].some(
      (id) => snapshot.accounts[id]?.actual !== undefined
    );
    if (!known) return null;
    return transactions
      .filter(
        (tx) =>
          tx.date.slice(0, 7) === snapshot.month &&
          spendingIds.has(tx.accountId) &&
          isVariableSpending(tx)
      )
      .reduce((sum, tx) => sum + Math.abs(tx.amount), 0);
  };

  const monthlySavingsAt = (index: number): number | null => {
    if (index === 0 || trackableIds.length === 0) return null;
    const current = snapshots[index];
    const previous = snapshots[index - 1];
    let sum = 0;
    for (const id of trackableIds) {
      const now = current.accounts[id]?.actual;
      const before = previous.accounts[id]?.actual;
      if (now === undefined || before === undefined) return null;
      sum += now - before;
    }
    return sum;
  };

  return snapshots.map((snapshot, index) => {
    const accountActuals: Record<string, number | null> = {};
    for (const a of accounts) {
      accountActuals[a.id] = snapshot.accounts[a.id]?.actual ?? null;
    }

    const knownLiquid = liquidIds
      .map((id) => accountActuals[id])
      .filter((v): v is number => v !== null && v !== undefined);
    const totalLiquid =
      knownLiquid.length > 0
        ? knownLiquid.reduce((sum, v) => sum + v, 0)
        : null;

    const mortgageSnapshot = mortgage
      ? snapshot.accounts[mortgage.id]
      : undefined;
    const restschuld = !mortgage
      ? 0
      : mortgageSnapshot?.actual === undefined
        ? null
        : mortgageSnapshot.projected;

    const netCashflow = transactions
      .filter((tx) => tx.date.slice(0, 7) === snapshot.month)
      .reduce((sum, tx) => sum + tx.amount, 0);

    return {
      month: snapshot.month,
      totalLiquid,
      restschuld,
      restschuldBridge: bridge.get(snapshot.month) ?? null,
      netCashflow,
      monthlySavings: monthlySavingsAt(index),
      monthlySpending: monthlySpendingAt(snapshot),
      accounts: accountActuals,
    };
  });
}
