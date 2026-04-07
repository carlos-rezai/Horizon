import type { MonthlySnapshot } from "../types/projection";
import type { AccountKind } from "../types/account";

export function findMilestoneMonth(
  snapshots: MonthlySnapshot[],
  accountId: string,
  targetBalance: number,
  accountKind: AccountKind
): string | null {
  for (const snapshot of snapshots) {
    const entry = snapshot.accounts[accountId];
    if (entry === undefined) continue;
    const crossed =
      accountKind === "Mortgage"
        ? entry.projected <= targetBalance
        : entry.projected >= targetBalance;
    if (crossed) return snapshot.month;
  }
  return null;
}

export function findMortgagePayoffMonth(
  snapshots: MonthlySnapshot[],
  mortgageAccountId: string
): string | null {
  for (const snapshot of snapshots) {
    const entry = snapshot.accounts[mortgageAccountId];
    if (entry !== undefined && entry.projected <= 0) {
      return snapshot.month;
    }
  }
  return null;
}
