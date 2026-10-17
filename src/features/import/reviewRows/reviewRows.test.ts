import { describe, it, expect } from "vitest";
import {
  approveProposal,
  blockersFor,
  buildReviewRows,
  canCommit,
  dismissProposal,
  FALLBACK_CATEGORY,
  flagsFor,
  propagateCategory,
  proposalsFor,
  summarizeReview,
  withoutProposal,
} from "./reviewRows";
import type { ReviewRow } from "./reviewRows";
import type { ParsedImportRow } from "../importTypes/importTypes";

const clean: ParsedImportRow = {
  id: "i1",
  date: "2026-11-02",
  description: "REWE SAGT DANKE",
  counterparty: "REWE SAGT DANKE",
  amount: -6284,
  category: "Groceries",
  categorySource: "unmatched",
};

const duplicate: ParsedImportRow = {
  id: "i4",
  date: "2026-11-03",
  description: "Restaurant Mitte",
  counterparty: "Restaurant Mitte",
  amount: -6400,
  category: "Dining",
  categorySource: "unmatched",
  duplicate: true,
};

const recurring: ParsedImportRow = {
  id: "i2",
  date: "2026-11-01",
  description: "Gehalt Arbeitgeber GmbH",
  counterparty: "Gehalt Arbeitgeber GmbH",
  amount: 412000,
  category: "Income",
  categorySource: "unmatched",
  recurring: true,
};

const both: ParsedImportRow = {
  id: "i5",
  date: "2026-11-05",
  description: "BVG Monatskarte",
  counterparty: "BVG Monatskarte",
  amount: -4900,
  category: "Transport",
  categorySource: "unmatched",
  duplicate: true,
  recurring: true,
};

const pending: ParsedImportRow = {
  id: "i6",
  date: "2026-11-04",
  description: "Umsatz vorgemerkt Amazon",
  counterparty: "Umsatz vorgemerkt Amazon",
  amount: -2999,
  category: "Shopping",
  categorySource: "unmatched",
  pending: true,
};

/** Parses fine, but the description column was empty — the commit schema's
 * `description.min(1)` rejects it, so it is a hard blocker, not a soft flag. */
const blank: ParsedImportRow = {
  id: "i7",
  date: "2026-11-06",
  description: "",
  counterparty: "",
  amount: -1850,
  category: "Uncategorized",
  categorySource: "unmatched",
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
    expect(row).toEqual({
      ...pending,
      included: false,
      flags: ["pending"],
      blockers: [],
    });
  });

  it("preserves all non-flag fields unchanged", () => {
    const [row] = buildReviewRows([clean]);
    expect(row).toEqual({
      ...clean,
      included: true,
      flags: [],
      blockers: [],
    });
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

  it("stamps the flag list on each row so the badges read from the same source as the pre-uncheck", () => {
    const [row] = buildReviewRows([both]);
    expect(row.flags).toEqual(["duplicate", "recurring"]);
  });

  it("stamps a pending flag so the row Horizon set aside can finally show why", () => {
    const [row] = buildReviewRows([pending]);
    expect(row.flags).toEqual(["pending"]);
  });

  it("leaves a clean row with an empty flag list", () => {
    const [row] = buildReviewRows([clean]);
    expect(row.flags).toEqual([]);
  });

  it("derives inclusion from the flag list — the badge count and the exclusion decision always agree", () => {
    const rows = buildReviewRows([clean, duplicate, recurring, both, pending]);
    for (const row of rows) {
      expect(row.included).toBe(row.flags.length === 0);
    }
  });

  it("keeps a soft flag off the row for a duplicate-and-blank row while still recording it as flagged and excluded", () => {
    const [row] = buildReviewRows([duplicateAndBlank]);
    expect(row.flags).toEqual(["duplicate"]);
    expect(row.included).toBe(false);
  });
});

describe("flagsFor", () => {
  it("reports no flags for a clean row", () => {
    expect(flagsFor(clean)).toEqual([]);
  });

  it("reports a duplicate flag", () => {
    expect(flagsFor(duplicate)).toEqual(["duplicate"]);
  });

  it("reports a recurring flag", () => {
    expect(flagsFor(recurring)).toEqual(["recurring"]);
  });

  it("reports a pending flag — the reason summarizeReview counts a row but the table used to render nothing", () => {
    expect(flagsFor(pending)).toEqual(["pending"]);
  });

  it("reports both flags for a row that is duplicate and recurring", () => {
    expect(flagsFor(both)).toEqual(["duplicate", "recurring"]);
  });

  it("does not treat a blank description as a flag — a blocker is never a flag", () => {
    expect(flagsFor(blank)).toEqual([]);
  });

  it("reports only the soft flag, not the blocker, for a duplicate-and-blank row", () => {
    expect(flagsFor(duplicateAndBlank)).toEqual(["duplicate"]);
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

  it("counts each flag off `flags`, not the raw booleans — the summary tracks the same source the badges render", () => {
    // A row whose raw booleans and `flags` disagree: `flags` is the authority.
    // Only rows carrying the flag in their list are counted.
    const rows: ReviewRow[] = [
      { ...buildReviewRows([clean])[0], flags: ["duplicate", "recurring"] },
      { ...buildReviewRows([clean])[0], id: "x2", flags: ["pending"] },
      { ...buildReviewRows([duplicate])[0], flags: [] },
    ];

    expect(summarizeReview(rows)).toMatchObject({
      duplicates: 1,
      recurring: 1,
      pending: 1,
    });
  });
});

/**
 * Same-Counterparty Propagation (#263): a category change on one row also
 * moves every same-Counterparty-Key row the user has not touched yet. A row is
 * touched once its Category Source is `chosen` — by hand or by an earlier
 * propagation — and is never overwritten again.
 */
describe("propagateCategory", () => {
  const row = (
    id: string,
    counterparty: string,
    overrides: Partial<ParsedImportRow> = {}
  ): ReviewRow =>
    buildReviewRows([
      {
        id,
        date: "2026-03-05",
        description: counterparty,
        counterparty,
        amount: -1999,
        category: "Miscellaneous",
        categorySource: "unmatched",
        ...overrides,
      },
    ])[0];

  const byId = (rows: ReviewRow[], id: string) =>
    rows.find((r) => r.id === id) as ReviewRow;

  it("moves every untouched row with the same Counterparty Key, not only identical text", () => {
    const rows = [
      row("a1", "AMAZON EU S.A.R.L., 302-1234567-7654321"),
      row("a2", "Amazon EU S.a.r.l. 028-9876543-1234567"),
      row("a3", "amazon eu", { category: "Food", categorySource: "suggested" }),
      row("r1", "REWE Markt GmbH", { category: "Food" }),
    ];

    const next = propagateCategory(rows, "a1", "Shopping");

    expect(byId(next, "a1").category).toBe("Shopping");
    expect(byId(next, "a2").category).toBe("Shopping");
    expect(byId(next, "a3").category).toBe("Shopping");
    // A different payee is left alone.
    expect(byId(next, "r1")).toMatchObject({
      category: "Food",
      categorySource: "unmatched",
    });
  });

  it("marks the edited row and every row that followed as chosen, dropping any proposal", () => {
    const rows = [
      row("a1", "Amazon EU", { categorySource: "learned", category: "Food" }),
      row("a2", "AMAZON EU 1234", {
        categorySource: "proposed",
        proposedCategory: "Shopping",
      }),
      row("a3", "amazon eu", { categorySource: "unmatched" }),
    ];

    const next = propagateCategory(rows, "a1", "Household");

    for (const id of ["a1", "a2", "a3"]) {
      expect(byId(next, id)).toMatchObject({
        category: "Household",
        categorySource: "chosen",
      });
      expect(byId(next, id).proposedCategory).toBeUndefined();
    }
  });

  it("never overwrites a touched row, whatever order the user edits in", () => {
    const rows = [
      row("a1", "Amazon EU"),
      // Already changed by hand before a1 is edited.
      row("a2", "Amazon EU", {
        category: "Household",
        categorySource: "chosen",
      }),
      row("a3", "Amazon EU"),
    ];

    const afterFirst = propagateCategory(rows, "a1", "Shopping");
    // a3 followed the first propagation, so a later one on a1 leaves it.
    const afterSecond = propagateCategory(afterFirst, "a1", "Books");

    expect(byId(afterFirst, "a2").category).toBe("Household");
    expect(byId(afterFirst, "a3").category).toBe("Shopping");
    expect(byId(afterSecond, "a1").category).toBe("Books");
    expect(byId(afterSecond, "a2").category).toBe("Household");
    expect(byId(afterSecond, "a3").category).toBe("Shopping");
  });

  it("still applies the edit to the edited row itself when it was already chosen", () => {
    const rows = [
      row("a1", "Amazon EU", {
        category: "Household",
        categorySource: "chosen",
      }),
      row("a2", "Amazon EU"),
    ];

    const next = propagateCategory(rows, "a1", "Shopping");

    expect(byId(next, "a1")).toMatchObject({
      category: "Shopping",
      categorySource: "chosen",
    });
    expect(byId(next, "a2").category).toBe("Shopping");
  });

  it("never propagates between rows with an empty Counterparty Key", () => {
    const rows = [
      row("e1", ""),
      row("e2", ""),
      // Digits and punctuation only — also no key.
      row("e3", "302-1234567 / 24.06.2026"),
    ];

    const next = propagateCategory(rows, "e1", "Shopping");

    expect(byId(next, "e1")).toMatchObject({
      category: "Shopping",
      categorySource: "chosen",
    });
    expect(byId(next, "e2")).toMatchObject({
      category: "Miscellaneous",
      categorySource: "unmatched",
    });
    expect(byId(next, "e3")).toMatchObject({
      category: "Miscellaneous",
      categorySource: "unmatched",
    });
  });

  it("is a no-op when the name equals the row's current category", () => {
    const rows = [
      row("a1", "Amazon EU", {
        category: "Shopping",
        categorySource: "learned",
      }),
      row("a2", "Amazon EU", { category: "Food", categorySource: "suggested" }),
    ];

    const next = propagateCategory(rows, "a1", "Shopping");

    expect(byId(next, "a1").categorySource).toBe("learned");
    expect(byId(next, "a2")).toMatchObject({
      category: "Food",
      categorySource: "suggested",
    });
  });

  it("keeps every other field of a row that follows", () => {
    const rows = [
      row("a1", "Amazon EU"),
      row("a2", "Amazon EU", { duplicate: true, amount: -4250 }),
    ];

    const next = propagateCategory(rows, "a1", "Shopping");

    expect(byId(next, "a2")).toMatchObject({
      amount: -4250,
      duplicate: true,
      included: false,
      flags: ["duplicate"],
    });
  });
});

/**
 * Category Proposals (#262), as pure transforms over the review rows. A row
 * proposes a category while its source is `proposed`; approving moves it into
 * the created category as `suggested`, dismissing returns it to Miscellaneous
 * as `unmatched`. A row the user already changed proposes nothing and is left
 * alone.
 */
describe("Category Proposal transforms", () => {
  const proposed = (id: string, name: string): ReviewRow =>
    buildReviewRows([
      {
        id,
        date: "2026-03-16",
        description: `Payee ${id}`,
        counterparty: `Payee ${id}`,
        amount: -1850,
        category: "Miscellaneous",
        categorySource: "proposed",
        proposedCategory: name,
      },
    ])[0];

  const learned: ReviewRow = buildReviewRows([
    {
      id: "l1",
      date: "2026-03-05",
      description: "REWE",
      counterparty: "REWE",
      amount: -1299,
      category: "Food",
      categorySource: "learned",
    },
  ])[0];

  /** A proposed row the user already changed in review. */
  const changed: ReviewRow = propagateCategory(
    [proposed("c1", "Dining")],
    "c1",
    "Food"
  )[0];

  const byId = (rows: ReviewRow[], id: string) =>
    rows.find((r) => r.id === id) as ReviewRow;

  describe("withoutProposal", () => {
    it("deletes the proposal field and keeps the rest of the row", () => {
      const row = proposed("p1", "Dining");
      const next = withoutProposal(row);
      expect("proposedCategory" in next).toBe(false);
      expect(next).toEqual({ ...row, proposedCategory: undefined });
      expect(row.proposedCategory).toBe("Dining");
    });
  });

  describe("proposalsFor", () => {
    it("gives one entry per proposed category in first-row order, with its row count", () => {
      const rows = [
        learned,
        proposed("s1", "Shopping"),
        proposed("d1", "Dining"),
        proposed("s2", "Shopping"),
      ];
      expect(proposalsFor(rows)).toEqual([
        { name: "Shopping", count: 2 },
        { name: "Dining", count: 1 },
      ]);
    });

    it("does not count a row the user already changed", () => {
      expect(proposalsFor([changed, proposed("d1", "Dining")])).toEqual([
        { name: "Dining", count: 1 },
      ]);
    });

    it("is empty once a proposal's rows are all gone", () => {
      expect(proposalsFor([learned, changed])).toEqual([]);
    });
  });

  describe("approveProposal", () => {
    it("moves the rows still proposing the name into the category, as suggested", () => {
      const next = approveProposal(
        [proposed("d1", "Dining"), proposed("d2", "Dining")],
        "Dining",
        "Dining"
      );
      for (const id of ["d1", "d2"]) {
        expect(byId(next, id)).toMatchObject({
          category: "Dining",
          categorySource: "suggested",
        });
        expect("proposedCategory" in byId(next, id)).toBe(false);
      }
    });

    it("leaves another proposal, a learned row and a changed row alone", () => {
      const shopping = proposed("s1", "Shopping");
      const next = approveProposal(
        [learned, changed, shopping, proposed("d1", "Dining")],
        "Dining",
        "Dining"
      );
      expect(byId(next, "l1")).toBe(learned);
      expect(byId(next, "c1")).toBe(changed);
      expect(byId(next, "s1")).toBe(shopping);
    });

    it("changes nothing when the proposal's rows are all gone", () => {
      const rows = [learned, changed];
      expect(approveProposal(rows, "Dining", "Dining")).toEqual(rows);
    });
  });

  describe("dismissProposal", () => {
    it("returns the rows still proposing the name to the fallback, as unmatched", () => {
      const next = dismissProposal([proposed("d1", "Dining")], "Dining");
      expect(next[0]).toMatchObject({
        category: FALLBACK_CATEGORY,
        categorySource: "unmatched",
      });
      expect("proposedCategory" in next[0]).toBe(false);
    });

    it("leaves another proposal and a changed row alone", () => {
      const shopping = proposed("s1", "Shopping");
      const next = dismissProposal(
        [changed, shopping, proposed("d1", "Dining")],
        "Dining"
      );
      expect(byId(next, "c1")).toBe(changed);
      expect(byId(next, "s1")).toBe(shopping);
    });

    it("changes nothing when the proposal's rows are all gone", () => {
      const rows = [learned, changed];
      expect(dismissProposal(rows, "Dining")).toEqual(rows);
    });
  });
});
