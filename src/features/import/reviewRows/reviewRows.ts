/**
 * Review-step model for the Import wizard.
 *
 * A parsed row carries an auto-assigned category plus optional duplicate /
 * recurring / pending flags from detection. {@link buildReviewRows} decorates
 * each row with an `included` flag, pre-unchecking duplicates, recurring, and
 * pending rows so the user doesn't double-count what Horizon already tracks or
 * commit a booking that hasn't settled yet.
 *
 * Soft flags and hard blockers are different things and never merge. A flag is
 * a reason Horizon pre-excluded the row; the user may opt back in. A blocker is
 * a reason the row cannot commit at all — it stays checked, at full opacity,
 * and gates the Import button until it is repaired in place or unchecked.
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

/**
 * A hard reason a row cannot commit. An open set, not a boolean: the row model
 * already drifted once by hand-maintaining per-reason branches.
 */
export type RowBlocker = "description";

/**
 * A soft reason Horizon pre-excluded the row. Drives both the pre-uncheck and
 * the badges from one source, so a counted-but-never-rendered flag — as
 * `pending` once was — becomes structurally impossible.
 */
export type RowFlag = "duplicate" | "recurring" | "pending";

/** A parsed row with its import-selection state, its soft flags, and its hard blockers. */
export interface ReviewRow extends ParsedImportRow {
  included: boolean;
  flags: RowFlag[];
  blockers: RowBlocker[];
}

export interface ReviewSummary {
  included: number;
  duplicates: number;
  recurring: number;
  pending: number;
}

/**
 * Pure over the row's *current* values, so an edit recomputes it and the error
 * clears on the keystroke. Mirrors the commit schema's `description.min(1)`: a
 * fast local guess that keeps the user out of dead ends, while the schema
 * remains the authority on what commits.
 */
export function blockersFor(row: ParsedImportRow): RowBlocker[] {
  return row.description.trim() === "" ? ["description"] : [];
}

/**
 * The single source for a row's soft flags. Ordered duplicate → recurring →
 * pending so a row with two flags reads its badges in a stable order. A blocker
 * is never a flag — a blank description gates the commit, it is not a reason
 * Horizon set the row aside.
 */
export function flagsFor(row: ParsedImportRow): RowFlag[] {
  const flags: RowFlag[] = [];
  if (row.duplicate) flags.push("duplicate");
  if (row.recurring) flags.push("recurring");
  if (row.pending) flags.push("pending");
  return flags;
}

export function buildReviewRows(rows: ParsedImportRow[]): ReviewRow[] {
  return rows.map((row) => {
    const flags = flagsFor(row);
    return {
      ...row,
      included: flags.length === 0,
      flags,
      blockers: blockersFor(row),
    };
  });
}

/** Included rows only — unchecking a row is a real way out, not a trick. */
export function canCommit(rows: ReviewRow[]): boolean {
  return rows.every((r) => !r.included || r.blockers.length === 0);
}

export function summarizeReview(rows: ReviewRow[]): ReviewSummary {
  // Counted off `flags`, the same source the badges render — so a change to
  // `flagsFor` moves the summary with it and the two can never drift, the drift
  // the `pending` bug was.
  const countFlag = (flag: RowFlag) =>
    rows.filter((r) => r.flags.includes(flag)).length;
  return {
    included: rows.filter((r) => r.included).length,
    duplicates: countFlag("duplicate"),
    recurring: countFlag("recurring"),
    pending: countFlag("pending"),
  };
}
