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

import { counterpartyKey } from "../../../utils/counterpartyKey/counterpartyKey";
import type {
  CategorySource,
  ParsedImportRow,
} from "../importTypes/importTypes";

/**
 * The client's name for the server's Miscellaneous fallback: the category a
 * row lands in when nothing categorizes it, or when its proposal is dismissed.
 */
export const FALLBACK_CATEGORY = "Miscellaneous";

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

/** A Category Proposal as the rows hold it: a canonical name and its row count. */
export interface ProposalCount {
  name: string;
  count: number;
}

/** True while the row still proposes `name` — the user has not changed it. */
const isProposedAs = (row: ReviewRow, name: string) =>
  row.categorySource === "proposed" && row.proposedCategory === name;

/** The one way to drop a row's Category Proposal: delete the field. */
export function withoutProposal<T extends ParsedImportRow>(row: T): T {
  const next = { ...row };
  delete next.proposedCategory;
  return next;
}

/** One entry per proposed category, in first-row order, counting its still-proposed rows. */
export function proposalsFor(rows: ReviewRow[]): ProposalCount[] {
  const counts = new Map<string, number>();
  for (const row of rows) {
    if (row.categorySource !== "proposed" || !row.proposedCategory) continue;
    counts.set(
      row.proposedCategory,
      (counts.get(row.proposedCategory) ?? 0) + 1
    );
  }
  return [...counts].map(([name, count]) => ({ name, count }));
}

/** Move the rows still proposing `name` into `category`, as `suggested`. */
export function approveProposal(
  rows: ReviewRow[],
  name: string,
  category: string
): ReviewRow[] {
  return rows.map((r) =>
    isProposedAs(r, name)
      ? { ...withoutProposal(r), category, categorySource: "suggested" }
      : r
  );
}

/** Return the rows still proposing `name` to the fallback, as `unmatched`. */
export function dismissProposal(rows: ReviewRow[], name: string): ReviewRow[] {
  return rows.map((r) =>
    isProposedAs(r, name)
      ? {
          ...withoutProposal(r),
          category: FALLBACK_CATEGORY,
          categorySource: "unmatched",
        }
      : r
  );
}

/** The chip text per Category Source; none for `chosen` or `unmatched`. */
const SOURCE_CHIP: Partial<Record<CategorySource, string>> = {
  learned: "Learned",
  suggested: "Suggested",
};

/**
 * The chip shown beside a row's picker, or `undefined` for none. A proposed
 * row names its Category Proposal; a row the user chose, or one left on the
 * fallback, carries no chip.
 */
export function categorySourceChip(row: ParsedImportRow): string | undefined {
  if (row.categorySource === "proposed") {
    return row.proposedCategory ? `New: ${row.proposedCategory}` : undefined;
  }
  return SOURCE_CHIP[row.categorySource];
}

/**
 * Same-Counterparty Propagation: set `name` on row `id`, and on every other row
 * with the same non-empty Counterparty Key the user has not touched yet. The
 * edited row and every row that follows become `chosen` (dropping any Category
 * Proposal), so the whole group teaches the Category Rule on commit. A touched
 * row — one already `chosen` — is never overwritten. Re-setting the row's own
 * category is not a choice and changes nothing.
 */
export function propagateCategory(
  rows: ReviewRow[],
  id: string,
  name: string
): ReviewRow[] {
  const edited = rows.find((r) => r.id === id);
  if (!edited || edited.category === name) return rows;
  const key = counterpartyKey(edited.counterparty);
  const follows = (r: ReviewRow) =>
    r.id === id ||
    (key !== "" &&
      r.categorySource !== "chosen" &&
      counterpartyKey(r.counterparty) === key);
  return rows.map((r) =>
    follows(r)
      ? { ...withoutProposal(r), category: name, categorySource: "chosen" }
      : r
  );
}
