import type {
  MonthlySnapshot,
  TrajectoryDataPoint,
  YearSummaryRow,
} from "../../types/projection";
import type { AccountKind, AccountWithBalance } from "../../types/account";
import type { RecurringTransaction } from "../../types/recurring";

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
    .map((a) => ({ id: a.id, name: a.name, kind: a.kind }));
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
  accounts: { id: string; kind: AccountKind }[],
  fromMonth: string,
  monthCount: number
): Map<string, number> {
  const mortgageIds = new Set(
    accounts.filter((a) => a.kind === "Mortgage").map((a) => a.id)
  );

  const stRecurring = recurringTransactions.filter(
    (rt) =>
      rt.frequency === "annual" &&
      rt.linkedAccountId !== undefined &&
      mortgageIds.has(rt.linkedAccountId)
  );

  const result = new Map<string, number>();

  for (const rt of stRecurring) {
    for (let i = 0; i < monthCount; i++) {
      const month = addMonths(fromMonth, i);
      const [yearStr, monthStr] = month.split("-");
      const monthNum = parseInt(monthStr, 10);

      if (rt.monthOfYear !== undefined) {
        if (monthNum !== rt.monthOfYear) continue;
      } else {
        // Legacy: fire at 12-month intervals from projection start
        if (i % 12 !== 0) continue;
      }

      const year = parseInt(yearStr, 10);
      const key = `${year}-${String(rt.monthOfYear ?? monthNum).padStart(2, "0")}`;
      result.set(key, (result.get(key) ?? 0) + rt.amount);
    }
  }

  return result;
}

export function deriveYearSummaries(
  snapshots: MonthlySnapshot[],
  mortgageAccountIds: string[],
  stMonths: Map<string, number>
): YearSummaryRow[] {
  if (snapshots.length === 0) return [];

  const byYear = new Map<number, MonthlySnapshot[]>();
  for (const s of snapshots) {
    const year = parseInt(s.month.slice(0, 4), 10);
    if (!byYear.has(year)) byYear.set(year, []);
    byYear.get(year)!.push(s);
  }

  const rows: YearSummaryRow[] = [];

  for (const [year, yearSnaps] of byYear) {
    const dec = yearSnaps.find((s) => s.month.endsWith("-12"));
    const yearEnd = dec ?? yearSnaps[yearSnaps.length - 1];

    const restschuld =
      mortgageAccountIds.length === 0
        ? null
        : mortgageAccountIds.reduce((sum, id) => {
            return sum + (yearEnd.accounts[id]?.projected ?? 0);
          }, 0);

    let stAmount: number | null = null;
    for (const [month, amount] of stMonths) {
      if (month.startsWith(`${year}-`)) {
        stAmount = (stAmount ?? 0) + amount;
      }
    }

    rows.push({ year, totalLiquid: yearEnd.totalLiquid, restschuld, stAmount });
  }

  return rows;
}

export function buildTrajectoryData(
  snapshots: MonthlySnapshot[],
  stMonths: Map<string, number>,
  payoffMonth: string | null,
  accounts: AccountWithBalance[]
): TrajectoryDataPoint[] {
  const mortgageAccountIds = accounts
    .filter((a) => a.kind === "Mortgage")
    .map((a) => a.id);
  const nonMortgageAccountIds = accounts
    .filter((a) => a.kind !== "Mortgage")
    .map((a) => a.id);

  let payoffReached = false;

  return snapshots.map((snapshot, index) => {
    const restschuldRaw = mortgageAccountIds.reduce(
      (sum, id) => sum + (snapshot.accounts[id]?.projected ?? 0),
      0
    );
    if (mortgageAccountIds.length > 0 && restschuldRaw <= 0) {
      payoffReached = true;
    }
    const restschuld =
      mortgageAccountIds.length === 0
        ? 0
        : payoffReached
          ? null
          : restschuldRaw;

    const accountBalances = Object.fromEntries(
      nonMortgageAccountIds.map((id) => [
        id,
        snapshot.accounts[id]?.projected ?? 0,
      ])
    );

    return {
      monthIndex: index,
      label: snapshot.month,
      totalLiquid: snapshot.totalLiquid,
      restschuld,
      isSTMonth: stMonths.has(snapshot.month),
      isPayoffMonth: snapshot.month === payoffMonth,
      ...accountBalances,
    };
  });
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
