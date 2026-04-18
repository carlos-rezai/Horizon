import type { MonthlySnapshot } from "../types/projection";
import type { AccountKind, AccountWithBalance } from "../types/account";

const KIND_ORDER: Record<AccountKind, number> = {
  Girokonto: 0,
  Tagesgeld: 1,
  Investment: 2,
  CreditCard: 3,
  Mortgage: 4,
};

export interface AccountColumn {
  id: string;
  name: string;
  kind: AccountKind;
}

export function buildAccountColumns(
  accounts: AccountWithBalance[]
): AccountColumn[] {
  return accounts
    .filter((a) => a.kind !== "Mortgage")
    .sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind])
    .map((a) => ({ id: a._id, name: a.name, kind: a.kind }));
}

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
