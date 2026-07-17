import { describe, it, expect } from "vitest";
import {
  blockersFor,
  buildReviewRows,
  canCommit,
  summarizeReview,
} from "./reviewRows";
import type { ParsedImportRow, ReviewRow } from "./reviewRows";

const clean: ParsedImportRow = {
  id: "i1",
  date: "2026-11-02",
  description: "REWE SAGT DANKE",
  amount: -6284,
  category: "Groceries",
};

const duplicate: ParsedImportRow = {
  id: "i4",
  date: "2026-11-03",
  description: "Restaurant Mitte",
  amount: -6400,
  category: "Dining",
  duplicate: true,
};

const recurring: ParsedImportRow = {
  id: "i2",
  date: "2026-11-01",
  description: "Gehalt Arbeitgeber GmbH",
  amount: 412000,
  category: "Income",
  recurring: true,
};

const both: ParsedImportRow = {
  id: "i5",
  date: "2026-11-05",
  description: "BVG Monatskarte",
  amount: -4900,
  category: "Transport",
  duplicate: true,
  recurring: true,
};

const pending: ParsedImportRow = {
  id: "i6",
  date: "2026-11-04",
  description: "Umsatz vorgemerkt Amazon",
  amount: -2999,
  category: "Shopping",
  pending: true,
};

/** Parses fine, but the description column was empty — the commit schema's
 * `description.min(1)` rejects it, so it is a hard blocker, not a soft flag. */
const blank: ParsedImportRow = {
  id: "i7",
  date: "2026-11-06",
  description: "",
  amount: -1850,
  category: "Uncategorized",
};

const whitespace: ParsedImportRow = { ...blank, id: "i8", description: "   " };

/** Horizon already set this aside, *and* its description is blank. */
const duplicateAndBlank: ParsedImportRow = {
  ...blank,
  id: "i9",
  duplicate: true,
};

describe("buildReviewRows", () => {
  it("includes a clean row by default", () => {
    const [row] = buildReviewRows([clean]);
    expect(row.included).toBe(true);
  });

  it("pre-unchecks a duplicate row", () => {
    const [row] = buildReviewRows([duplicate]);
    expect(row.included).toBe(false);
  });

  it("pre-unchecks a recurring row", () => {
    const [row] = buildReviewRows([recurring]);
    expect(row.included).toBe(false);
  });

  it("pre-unchecks a row that is both duplicate and recurring", () => {
    const [row] = buildReviewRows([both]);
    expect(row.included).toBe(false);
  });

  it("pre-unchecks a pending row", () => {
    const [row] = buildReviewRows([pending]);
    expect(row.included).toBe(false);
  });

  it("keeps a pre-unchecked pending row re-checkable — its value is preserved, not dropped", () => {
    const [row] = buildReviewRows([pending]);
    expect(row).toEqual({ ...pending, included: false, blockers: [] });
  });

  it("preserves all non-flag fields unchanged", () => {
    const [row] = buildReviewRows([clean]);
    expect(row).toEqual({ ...clean, included: true, blockers: [] });
  });

  it("attaches a description blocker to a blank-description row", () => {
    const [row] = buildReviewRows([blank]);
    expect(row.blockers).toEqual(["description"]);
  });

  it("leaves a clean row unblocked", () => {
    const [row] = buildReviewRows([clean]);
    expect(row.blockers).toEqual([]);
  });

  it("includes a blank-description row by default — a real transaction is never silently dropped", () => {
    const [row] = buildReviewRows([blank]);
    expect(row.included).toBe(true);
  });

  it("excludes a row that is both duplicate and blank, and still records the blocker", () => {
    const [row] = buildReviewRows([duplicateAndBlank]);
    expect(row.included).toBe(false);
    expect(row.blockers).toEqual(["description"]);
  });
});

describe("blockersFor", () => {
  it("reports a description blocker for a blank description", () => {
    expect(blockersFor(blank)).toEqual(["description"]);
  });

  it("reports a description blocker for a whitespace-only description", () => {
    expect(blockersFor(whitespace)).toEqual(["description"]);
  });

  it("reports nothing for a filled description", () => {
    expect(blockersFor(clean)).toEqual([]);
  });

  it("is pure over the row's current values — a repaired row blocks no longer", () => {
    expect(blockersFor({ ...blank, description: "Bäckerei Müller" })).toEqual(
      []
    );
  });

  it("does not treat a soft flag as a blocker", () => {
    expect(blockersFor(duplicate)).toEqual([]);
    expect(blockersFor(recurring)).toEqual([]);
    expect(blockersFor(pending)).toEqual([]);
  });
});

describe("canCommit", () => {
  it("is true when no row is blocked", () => {
    expect(canCommit(buildReviewRows([clean, duplicate, recurring]))).toBe(
      true
    );
  });

  it("is false when an included row is blocked", () => {
    expect(canCommit(buildReviewRows([clean, blank]))).toBe(false);
  });

  it("is true when only an excluded row is blocked — unchecking is a real escape hatch", () => {
    const rows: ReviewRow[] = buildReviewRows([clean, blank]).map((r) =>
      r.id === blank.id ? { ...r, included: false } : r
    );

    expect(canCommit(rows)).toBe(true);
  });

  it("is true when a blocked row carries a soft flag, since that row starts excluded", () => {
    expect(canCommit(buildReviewRows([clean, duplicateAndBlank]))).toBe(true);
  });

  it("is false once the user opts a blocked, soft-flagged row back in", () => {
    const rows: ReviewRow[] = buildReviewRows([clean, duplicateAndBlank]).map(
      (r) => (r.id === duplicateAndBlank.id ? { ...r, included: true } : r)
    );

    expect(canCommit(rows)).toBe(false);
  });

  it("is true for an empty table — nothing blocked, nothing to commit", () => {
    expect(canCommit([])).toBe(true);
  });
});

describe("summarizeReview", () => {
  it("reports included, duplicate, recurring, and pending counts on a mixed set", () => {
    const rows = buildReviewRows([clean, duplicate, recurring, both]);

    expect(summarizeReview(rows)).toEqual({
      included: 1,
      duplicates: 2,
      recurring: 2,
      pending: 0,
    });
  });

  it("counts pending rows and pre-unchecks them alongside duplicates and recurring", () => {
    const rows = buildReviewRows([clean, duplicate, recurring, pending]);

    expect(summarizeReview(rows)).toEqual({
      included: 1,
      duplicates: 1,
      recurring: 1,
      pending: 1,
    });
  });
});
