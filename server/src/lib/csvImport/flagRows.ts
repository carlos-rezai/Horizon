/**
 * Row-flagging against the target account's history: flag each mapped statement
 * row that duplicates an existing transaction or matches a recurring rule, so
 * the wizard can pre-uncheck it. This is row-level matching against account
 * data — distinct from statement/bank detection, which lives in
 * `detectStatement.ts`.
 */
import type { Transaction, RecurringTransaction } from "../../storage/types.js";
import type { MappedRow } from "./types.js";

/** Absolute-cents tolerance when matching a row against a recurring amount. */
const RECURRING_AMOUNT_TOLERANCE_CENTS = 100;

/** Lowercase, collapse internal whitespace, trim. */
function normalizeDescription(description: string): string {
  return description.toLowerCase().replace(/\s+/g, " ").trim();
}

/** Identity key for duplicate detection: signed amount + ISO date + description. */
function duplicateKey(
  amount: number,
  date: string,
  description: string
): string {
  return `${amount}|${date}|${normalizeDescription(description)}`;
}

/**
 * Flag each row that duplicates an existing account transaction (same signed
 * amount, same ISO date, equal normalized description) or an earlier row in the
 * same file. Within a file only the later occurrence is flagged.
 */
export function detectDuplicates(
  rows: MappedRow[],
  existingTxns: Transaction[]
): boolean[] {
  const existingKeys = new Set(
    existingTxns.map((txn) =>
      duplicateKey(txn.amount, txn.date, txn.description)
    )
  );
  const seen = new Set<string>();
  return rows.map((row) => {
    const key = duplicateKey(row.amount, row.date, row.description);
    const isDuplicate = existingKeys.has(key) || seen.has(key);
    seen.add(key);
    return isDuplicate;
  });
}

/**
 * Flag each row that matches an existing recurring transaction: same sign,
 * absolute amount within tolerance, and description containment in either
 * direction (case-insensitive).
 */
export function detectRecurring(
  rows: MappedRow[],
  recurring: RecurringTransaction[]
): boolean[] {
  return rows.map((row) => {
    const rowDescription = normalizeDescription(row.description);
    return recurring.some((rule) => {
      if (Math.sign(row.amount) !== Math.sign(rule.amount)) {
        return false;
      }
      const amountClose =
        Math.abs(Math.abs(row.amount) - Math.abs(rule.amount)) <=
        RECURRING_AMOUNT_TOLERANCE_CENTS;
      if (!amountClose) {
        return false;
      }
      const ruleDescription = normalizeDescription(rule.description);
      return (
        rowDescription.includes(ruleDescription) ||
        ruleDescription.includes(rowDescription)
      );
    });
  });
}
