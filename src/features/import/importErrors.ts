/**
 * Attribution of a rejected commit's structured issues back onto the review
 * rows that caused them.
 *
 * When `POST /imports` rejects the payload it answers with both a readable
 * `error` (the floor) and the Zod `issues` (the structure). Each issue's path
 * is `["rows", n, field]` where `n` indexes the *filtered commit payload* —
 * `rows.filter(r => r.included)` — never the wizard's `rows` state. The commit
 * holds that filtered array and passes its ordered ids here, so index `n` maps
 * to the id of the nth included row, not to `rows[n]`. Reading `rows[n]` would
 * confidently blame an innocent row — worse than a generic failure.
 *
 * Anything that can't be pinned to a row and a known blocker falls to the
 * `error` floor rather than being guessed at: a non-row path becomes an
 * `unattributed` message; a malformed, out-of-range, or unknown-field row path
 * is ignored.
 */

import type { RowBlocker } from "./reviewRows";

/** The structural subset of a Zod issue attribution needs. */
export interface AttributableIssue {
  path: (string | number)[];
  message: string;
}

export interface AttributedIssues {
  /** Per committed-row id, the blockers the server pinned to it. */
  byRowId: Map<string, RowBlocker[]>;
  /** Messages with no row to attach to — surfaced via the `error` floor. */
  unattributed: string[];
}

/** The row fields the review UI can repair in place. Mirrors {@link RowBlocker}. */
const KNOWN_BLOCKERS: ReadonlySet<RowBlocker> = new Set(["description"]);

function isBlocker(field: string): field is RowBlocker {
  return KNOWN_BLOCKERS.has(field as RowBlocker);
}

export function attributeIssues(
  issues: AttributableIssue[],
  committedRowIds: string[]
): AttributedIssues {
  const byRowId = new Map<string, RowBlocker[]>();
  const unattributed: string[] = [];

  for (const issue of issues) {
    const [head, index, field] = issue.path;

    if (head !== "rows") {
      // A non-row path (bad accountId, malformed mapping) has no row to attach
      // to; an empty path names nothing. Only a path that actually points
      // somewhere becomes a floor message.
      if (issue.path.length > 0) unattributed.push(issue.message);
      continue;
    }

    // A row-shaped path we can't confidently attribute is dropped, never
    // blamed on an innocent row: a non-numeric or out-of-range index, a
    // missing field segment, or a field that isn't a repairable blocker.
    if (typeof index !== "number") continue;
    const rowId = committedRowIds[index];
    if (rowId === undefined) continue;
    if (typeof field !== "string" || !isBlocker(field)) continue;

    const existing = byRowId.get(rowId);
    if (existing) existing.push(field);
    else byRowId.set(rowId, [field]);
  }

  return { byRowId, unattributed };
}

/**
 * A commit rejected by the server. Carries the readable floor message (as the
 * `Error` message) plus the structured issues so the wizard can land each on
 * its row. A plain `Error` still means "no structure to attribute".
 */
export class ImportCommitError extends Error {
  readonly issues: AttributableIssue[];

  constructor(message: string, issues: AttributableIssue[]) {
    super(message);
    this.name = "ImportCommitError";
    this.issues = issues;
  }
}
