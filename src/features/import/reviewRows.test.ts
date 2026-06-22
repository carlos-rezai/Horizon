import { describe, it, expect } from "vitest";
import { buildReviewRows, summarizeReview } from "./reviewRows";
import type { ParsedImportRow } from "./reviewRows";

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

  it("preserves all non-flag fields unchanged", () => {
    const [row] = buildReviewRows([clean]);
    expect(row).toEqual({ ...clean, included: true });
  });
});

describe("summarizeReview", () => {
  it("reports included, duplicate, and recurring counts on a mixed set", () => {
    const rows = buildReviewRows([clean, duplicate, recurring, both]);

    expect(summarizeReview(rows)).toEqual({
      included: 1,
      duplicates: 2,
      recurring: 2,
    });
  });
});
