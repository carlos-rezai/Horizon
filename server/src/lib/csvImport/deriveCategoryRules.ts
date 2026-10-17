import type { CategoryRuleInput } from "../../storage/types.js";
import { counterpartyKey } from "./counterpartyKey.js";
import type { CategorySource } from "./types.js";

/** One committed row, as far as rule derivation needs it. */
export interface TeachingRowInput {
  /** ISO date. */
  date: string;
  /** The raw Counterparty; the key is always re-derived from it. */
  counterparty: string;
  category: string;
  categorySource: CategorySource;
}

/** Sources whose category the user approved by committing the row. */
const TEACHING_SOURCES: ReadonlySet<CategorySource> = new Set([
  "learned",
  "suggested",
  "chosen",
]);

interface Tally {
  count: number;
  /** The latest date seen for this category, and the row index at it. */
  latestDate: string;
  latestIndex: number;
}

/** True when tally `a` beats tally `b`: more rows, then latest date, then later row. */
function beats(a: Tally, b: Tally): boolean {
  if (a.count !== b.count) return a.count > b.count;
  if (a.latestDate !== b.latestDate) return a.latestDate > b.latestDate;
  return a.latestIndex > b.latestIndex;
}

/**
 * Derive the Category Rules one committed statement teaches. A row teaches when
 * its source is `learned`, `suggested` or `chosen` and its re-derived
 * Counterparty Key is non-empty. Per key, the category with the most teaching
 * rows wins; ties go to the latest date, then to the later row.
 */
export function deriveCategoryRules(
  rows: readonly TeachingRowInput[]
): CategoryRuleInput[] {
  const tallies = new Map<string, Map<string, Tally>>();

  rows.forEach((row, index) => {
    if (!TEACHING_SOURCES.has(row.categorySource)) return;
    const key = counterpartyKey(row.counterparty);
    if (key === "") return;

    const byCategory = tallies.get(key) ?? new Map<string, Tally>();
    tallies.set(key, byCategory);
    const tally = byCategory.get(row.category);
    if (!tally) {
      byCategory.set(row.category, {
        count: 1,
        latestDate: row.date,
        latestIndex: index,
      });
      return;
    }
    tally.count += 1;
    if (row.date >= tally.latestDate) {
      tally.latestDate = row.date;
      tally.latestIndex = index;
    }
  });

  const rules: CategoryRuleInput[] = [];
  for (const [key, byCategory] of tallies) {
    let best: { category: string; tally: Tally } | null = null;
    for (const [category, tally] of byCategory) {
      if (!best || beats(tally, best.tally)) best = { category, tally };
    }
    if (best) rules.push({ counterpartyKey: key, category: best.category });
  }
  return rules;
}
