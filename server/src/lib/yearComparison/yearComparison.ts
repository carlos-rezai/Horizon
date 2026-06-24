import type { AccountKind } from "../../storage/types.js";
import { parseYearMonth } from "../date/date.js";

/** Minimal account shape the year-comparison needs: identity and kind. */
export interface YcAccountEntry {
  id: string;
  kind: AccountKind;
}

/** Minimal transaction shape: enough to window, filter, and bucket spend. */
export interface YcTxEntry {
  accountId: string;
  date: string;
  amount: number;
  category: string;
  transferId?: string;
  isAutoSettlement?: boolean;
}

/** One ranked category row: this-year magnitude paired with last-year's. */
export interface YcRow {
  category: string;
  thisYear: number;
  lastYear: number;
}

/** Mortgage and Investment never hold variable spending. */
const NON_SPENDING_KINDS: ReadonlySet<AccountKind> = new Set([
  "Mortgage",
  "Investment",
]);

const TOP_N = 5;

/**
 * Cumulative variable spend per category, January through the viewed month
 * inclusive, paired against the identical span one year earlier.
 *
 * A deep module: it owns window resolution (whole calendar months, both
 * years), the Variable-Spending filter (transfer legs and auto-settlement
 * excluded), the spending-account filter (Mortgage and Investment excluded by
 * kind), absolute-cents summation, year pairing, ranking by `thisYear`
 * descending, and the top-5 cap. Mirrors `lib/projection` / `lib/cashflow` /
 * `lib/settlement`.
 */
export function computeYearComparison(
  transactions: YcTxEntry[],
  accounts: YcAccountEntry[],
  viewedMonth: string
): YcRow[] {
  const { year: viewedYear, month: viewedMonthNum } =
    parseYearMonth(viewedMonth);

  const spendingAccountIds = new Set(
    accounts.filter((a) => !NON_SPENDING_KINDS.has(a.kind)).map((a) => a.id)
  );

  const totals = new Map<string, { thisYear: number; lastYear: number }>();

  for (const tx of transactions) {
    if (!spendingAccountIds.has(tx.accountId)) continue;
    if (tx.transferId || tx.isAutoSettlement) continue;

    const { year, month } = parseYearMonth(tx.date);
    if (month < 1 || month > viewedMonthNum) continue;

    const bucket =
      year === viewedYear
        ? "thisYear"
        : year === viewedYear - 1
          ? "lastYear"
          : null;
    if (bucket === null) continue;

    const entry = totals.get(tx.category) ?? { thisYear: 0, lastYear: 0 };
    entry[bucket] += Math.abs(tx.amount);
    totals.set(tx.category, entry);
  }

  return [...totals.entries()]
    .map(([category, { thisYear, lastYear }]) => ({
      category,
      thisYear,
      lastYear,
    }))
    .sort(
      (a, b) => b.thisYear - a.thisYear || a.category.localeCompare(b.category)
    )
    .slice(0, TOP_N);
}
