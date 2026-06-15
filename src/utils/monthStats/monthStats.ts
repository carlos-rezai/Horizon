import type { Transaction } from "../../types/transaction";

/**
 * The Month Overview headline figures, all in cents. Expenses are negative, so
 * `variableSpending`, `ofWhichCat`, and `avgPerDay` are typically negative too.
 */
export interface MonthStats {
  /** Sum of every variable-spending amount in the month. */
  variableSpending: number;
  /** Subtotal for the highlighted "Cat" category (cat-food spending). */
  ofWhichCat: number;
  /** Count of variable-spending transactions. */
  entries: number;
  /** Variable spending divided by the calendar days in the month, in cents. */
  avgPerDay: number;
}

/** The single category the prototype surfaces as its own headline figure. */
const HIGHLIGHT_CATEGORY = "Cat";

/**
 * Variable Spending is the only category of actual transaction in the
 * Recurring-Only model — one-off transfer legs and credit-card auto-settlement
 * are bookkeeping movements, not spending, so they are excluded here.
 */
export function selectVariableSpending(
  transactions: Transaction[]
): Transaction[] {
  return transactions.filter((t) => !t.transferId && !t.isAutoSettlement);
}

/** Calendar days in an ISO `YYYY-MM` month (handles leap years). */
export function daysInMonth(month: string): number {
  const [year, monthNum] = month.split("-").map(Number);
  return new Date(year, monthNum, 0).getDate();
}

/** Derive the four Month Overview stat-strip figures for a given month. */
export function deriveMonthStats(
  transactions: Transaction[],
  month: string
): MonthStats {
  const spending = selectVariableSpending(transactions);

  const variableSpending = spending.reduce((sum, t) => sum + t.amount, 0);
  const ofWhichCat = spending
    .filter((t) => t.category === HIGHLIGHT_CATEGORY)
    .reduce((sum, t) => sum + t.amount, 0);
  const entries = spending.length;

  const days = daysInMonth(month);
  const avgPerDay = days > 0 ? Math.round(variableSpending / days) : 0;

  return { variableSpending, ofWhichCat, entries, avgPerDay };
}
