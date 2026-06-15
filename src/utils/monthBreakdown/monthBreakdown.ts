import type { Transaction } from "../../types/transaction";
import { colorForCategoryName } from "../categoryColor/categoryColor";
import { selectVariableSpending } from "../monthStats/monthStats";

/**
 * One slice of the Month Overview breakdown donut. `amount` is a positive
 * magnitude in cents (expenses are summed by absolute value). Structurally
 * compatible with the `Donut` component's `DonutSegment`.
 */
export interface BreakdownSlice {
  label: string;
  color: string;
  amount: number;
}

export interface Breakdown {
  /** One slice per category with spending, sorted descending by amount. */
  segments: BreakdownSlice[];
  /** Sum of every slice magnitude, in cents. */
  total: number;
}

/**
 * Group a month's variable spending by category into donut slices. Amounts are
 * absolute magnitudes so the ring renders regardless of expense sign; colours
 * are resolved deterministically from each category name.
 */
export function deriveBreakdown(transactions: Transaction[]): Breakdown {
  const byCategory = new Map<string, number>();
  for (const t of selectVariableSpending(transactions)) {
    byCategory.set(
      t.category,
      (byCategory.get(t.category) ?? 0) + Math.abs(t.amount)
    );
  }

  const segments: BreakdownSlice[] = [...byCategory.entries()]
    .map(([label, amount]) => ({
      label,
      color: colorForCategoryName(label),
      amount,
    }))
    .sort((a, b) => b.amount - a.amount);

  const total = segments.reduce((sum, s) => sum + s.amount, 0);

  return { segments, total };
}
