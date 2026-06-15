/**
 * Review-step model for the Import wizard.
 *
 * A parsed row carries an auto-assigned category plus optional duplicate /
 * recurring flags from detection. {@link buildReviewRows} decorates each row
 * with an `included` flag, pre-unchecking duplicates and recurring rows so
 * the user doesn't double-count what Horizon already tracks.
 */

/** A row produced by the (deferred) parse + detection seam. */
export interface ParsedImportRow {
  id: string;
  date: string;
  desc: string;
  amount: number;
  cat: string;
  duplicate?: boolean;
  recurring?: boolean;
}

/** A parsed row with its import-selection state. */
export interface ReviewRow extends ParsedImportRow {
  included: boolean;
}

export interface ReviewSummary {
  included: number;
  duplicates: number;
  recurring: number;
}

export function buildReviewRows(rows: ParsedImportRow[]): ReviewRow[] {
  return rows.map((row) => ({
    ...row,
    included: !row.duplicate && !row.recurring,
  }));
}

export function summarizeReview(rows: ReviewRow[]): ReviewSummary {
  return {
    included: rows.filter((r) => r.included).length,
    duplicates: rows.filter((r) => r.duplicate).length,
    recurring: rows.filter((r) => r.recurring).length,
  };
}
