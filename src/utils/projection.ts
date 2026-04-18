import type { MonthlySnapshot } from "../types/projection";
import type { AccountKind, AccountWithBalance } from "../types/account";
import type { RecurringTransaction } from "../types/recurring";

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

function addMonths(yyyyMM: string, n: number): string {
  const [yearStr, monthStr] = yyyyMM.split("-");
  const totalMonths =
    parseInt(yearStr, 10) * 12 + (parseInt(monthStr, 10) - 1) + n;
  const year = Math.floor(totalMonths / 12);
  const month = (totalMonths % 12) + 1;
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function deriveSTMonths(
  recurringTransactions: RecurringTransaction[],
  accounts: { _id: string; kind: AccountKind }[],
  fromMonth: string,
  monthCount: number
): Map<string, number> {
  const mortgageIds = new Set(
    accounts.filter((a) => a.kind === "Mortgage").map((a) => a._id)
  );

  const stRecurring = recurringTransactions.filter(
    (rt) =>
      rt.frequency === "annual" &&
      rt.linkedAccountId !== undefined &&
      mortgageIds.has(rt.linkedAccountId)
  );

  const result = new Map<string, number>();

  for (let i = 0; i < monthCount; i++) {
    if (i % 12 !== 0) continue;
    const month = addMonths(fromMonth, i);
    for (const rt of stRecurring) {
      result.set(month, (result.get(month) ?? 0) + rt.amount);
    }
  }

  return result;
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
