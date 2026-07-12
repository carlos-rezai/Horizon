import type { AccountKind } from "../../storage/types.js";
import type { MonthlySnapshot } from "./projection.js";

/**
 * A single reconstructed month on the History view. All monetary values are
 * integer cents.
 */
export interface HistoryPoint {
  /** "YYYY-MM" */
  month: string;
  /** Σ of liquid accounts' `actual` balances. */
  totalLiquid: number;
  /** The mortgage's replayed `projected` balance (0 when there is no mortgage). */
  restschuld: number;
  /** Σ of that month's real stored transactions (not the recurring figure). */
  netCashflow: number;
  /** Per-account `actual` balance. */
  accounts: Record<string, number>;
}

/** The minimal shape `deriveHistory` needs from a stored transaction. */
export interface HistoryTx {
  accountId: string;
  date: string;
  amount: number;
}

/** The minimal shape `deriveHistory` needs from an account. */
export interface HistoryAccount {
  id: string;
  kind: AccountKind;
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
  const liquidIds = accounts
    .filter((a) => a.kind === "Girokonto" || a.kind === "Tagesgeld")
    .map((a) => a.id);

  return snapshots.map((snapshot) => {
    const accountActuals: Record<string, number> = {};
    for (const a of accounts) {
      accountActuals[a.id] = snapshot.accounts[a.id]?.actual ?? 0;
    }

    const totalLiquid = liquidIds.reduce(
      (sum, id) => sum + (accountActuals[id] ?? 0),
      0
    );

    const restschuld = mortgage
      ? (snapshot.accounts[mortgage.id]?.projected ?? 0)
      : 0;

    const netCashflow = transactions
      .filter((tx) => tx.date.slice(0, 7) === snapshot.month)
      .reduce((sum, tx) => sum + tx.amount, 0);

    return {
      month: snapshot.month,
      totalLiquid,
      restschuld,
      netCashflow,
      accounts: accountActuals,
    };
  });
}
