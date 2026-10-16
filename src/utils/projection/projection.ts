import type {
  MonthlySnapshot,
  TrajectoryDataPoint,
  YearSummaryRow,
} from "../../types/projection";
import type { AccountKind, AccountWithBalance } from "../../types/account";
import type { RecurringTransaction } from "../../types/recurring";
import { resolveAccountColor } from "../color/color";

export interface AccountColumn {
  id: string;
  name: string;
  kind: AccountKind;
  /** The account's resolved colour — its own, else its kind's chart colour. */
  color: string;
}

/**
 * One column per non-Mortgage account, in input order — the server already
 * returns accounts by their sortOrder. Accounts hidden from the trajectory
 * chart are still columns; the Mortgage is the Restschuld column instead.
 */
export function buildAccountColumns(
  accounts: AccountWithBalance[]
): AccountColumn[] {
  return accounts
    .filter((a) => a.kind !== "Mortgage")
    .map((a) => ({
      id: a.id,
      name: a.name,
      kind: a.kind,
      color: resolveAccountColor(a),
    }));
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

/**
 * The combined Restschuld in one month: the sum of every Mortgage's
 * *projected* balance, 0 with no mortgages. Always the projected balance,
 * never the actual: a Mortgage's "actual" is just its un-replayed opening
 * balance (ST is modelled as a recurring transfer, not an actual
 * transaction), so mixing it in would fabricate a phantom step-down at the
 * current-month boundary.
 */
export function totalRestschuld(
  snapshot: MonthlySnapshot,
  mortgageIds: string[]
): number {
  return mortgageIds.reduce(
    (sum, id) => sum + (snapshot.accounts[id]?.projected ?? 0),
    0
  );
}

function restschuldIn(
  snapshot: MonthlySnapshot,
  mortgageIds: string[]
): number {
  return mortgageIds.reduce(
    (sum, id) => sum + (snapshot.accounts[id]?.projected ?? 0),
    0
  );
}

/**
 * The ST Months that actually reduce the Restschuld: every `deriveSTMonths`
 * entry up to and including the Payoff Month, its amount capped at the
 * Restschuld left at the end of the previous month. Transfers after payoff
 * are dropped — the engine refunds them to their source.
 */
export function effectiveSTMonths(
  stMonths: Map<string, number>,
  snapshots: MonthlySnapshot[],
  mortgageIds: string[]
): Map<string, number> {
  const result = new Map<string, number>();
  if (mortgageIds.length === 0 || stMonths.size === 0) return result;

  const previousRestschuld = new Map<string, number>();
  let payoffMonth: string | null = null;
  let prior: number | undefined;
  for (const snapshot of snapshots) {
    const restschuld = restschuldIn(snapshot, mortgageIds);
    if (prior !== undefined) previousRestschuld.set(snapshot.month, prior);
    if (payoffMonth === null && restschuld <= 0) payoffMonth = snapshot.month;
    prior = restschuld;
  }

  const ordered = [...stMonths.entries()].sort(([a], [b]) =>
    a < b ? -1 : a > b ? 1 : 0
  );
  for (const [month, amount] of ordered) {
    if (payoffMonth !== null && month > payoffMonth) continue;
    const before = previousRestschuld.get(month);
    result.set(month, before === undefined ? amount : Math.min(amount, before));
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

    const netCashflow = yearSnaps.reduce((sum, s) => sum + s.netCashflow, 0);

    rows.push({
      year,
      totalLiquid: yearEnd.totalLiquid,
      restschuld,
      stAmount,
      netCashflow,
    });
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
