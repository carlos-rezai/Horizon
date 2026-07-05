/**
 * Review-step model for the Import wizard.
 *
 * A parsed row carries an auto-assigned category plus optional duplicate /
 * recurring / pending flags from detection. {@link buildReviewRows} decorates
 * each row with an `included` flag, pre-unchecking duplicates, recurring, and
 * pending rows so the user doesn't double-count what Horizon already tracks or
 * commit a booking that hasn't settled yet.
 */

/** A previewed row as returned by the parse + detection engine. */
export interface ParsedImportRow {
  id: string;
  date: string;
  description: string;
  amount: number;
  category: string;
  duplicate?: boolean;
  recurring?: boolean;
  /** Not-yet-settled (pending / "vorgemerkt") booking; pre-unchecked. */
  pending?: boolean;
}

/** A parsed row with its import-selection state. */
export interface ReviewRow extends ParsedImportRow {
  included: boolean;
}

export interface ReviewSummary {
  included: number;
  duplicates: number;
  recurring: number;
  pending: number;
}

export function buildReviewRows(rows: ParsedImportRow[]): ReviewRow[] {
  return rows.map((row) => ({
    ...row,
    included: !row.duplicate && !row.recurring && !row.pending,
  }));
}

export function summarizeReview(rows: ReviewRow[]): ReviewSummary {
  return {
    included: rows.filter((r) => r.included).length,
    duplicates: rows.filter((r) => r.duplicate).length,
    recurring: rows.filter((r) => r.recurring).length,
    pending: rows.filter((r) => r.pending).length,
  };
}
