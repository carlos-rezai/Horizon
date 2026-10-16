import type { AccountKind } from "../../storage/types.js";
import type { MonthlySnapshot } from "./projection.js";

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
  /** Σ of that month's real stored transactions (not the recurring figure). */
  netCashflow: number;
  /** Per-account `actual` balance; null before that account's Known Since. */
  accounts: Record<string, number | null>;
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
      netCashflow,
      accounts: accountActuals,
    };
  });
}
