import { describe, expect, it } from "vitest";
import { categorizeRow, KEYWORD_GROUPS } from "./categorizeRow.js";
import { counterpartyKey } from "./counterpartyKey.js";
import type { Category } from "../../storage/types.js";
import type { MappedRow } from "./types.js";

// ---------------------------------------------------------------------------
// Issue #260 — Import Category Learning, Phase 3: Keyword Groups.
//
// `categorizeRow(row, ctx)` is the one pure categorizer. Precedence: a Category
// Rule for the row's Counterparty Key → the first matching Keyword Group that
// resolves to a visible category (by canonical name or synonym, ignoring case)
// → Miscellaneous / unmatched. The haystack is the lowercased counterparty plus
// the description, matched by substring.
//
// The exact keyword lists are a build detail. These tests lean only on a few
// unmistakable German household payees — REWE (Groceries), Netflix
// (Subscriptions) — which any Keyword Group vocabulary carries.
// ---------------------------------------------------------------------------

function row(counterparty: string, description = counterparty): MappedRow {
  return {
    date: "2026-06-24",
    description,
    amount: -2041,
    counterparty,
    pending: false,
  };
}

function category(name: string, hidden = false): Category {
  return {
    id: `c-${name.toLowerCase()}`,
    name,
    isDefault: false,
    color: "#74C29B",
    hidden,
  };
}

function ctx(categories: Category[], rules: Map<string, string> = new Map()) {
  return { rules, categories, declined: new Set<string>() };
}

const CANONICAL_NAMES = [
  "Groceries",
  "Dining",
  "Transport",
  "Shopping",
  "Health",
  "Housing",
  "Income",
  "Subscriptions",
  "Entertainment",
  "Investment",
  "Transfer",
  "Insurance",
];

const MISC = category("Miscellaneous");

describe("KEYWORD_GROUPS", () => {
  it("ships one group per canonical category name", () => {
    expect(KEYWORD_GROUPS.map((group) => group.category).sort()).toEqual(
      [...CANONICAL_NAMES].sort()
    );
  });
});

describe("categorizeRow — Keyword Groups (#260)", () => {
  it("suggests the visible category carrying a group's canonical name", () => {
    const result = categorizeRow(
      row("REWE Markt 0815"),
      ctx([category("Groceries"), MISC])
    );

    expect(result).toMatchObject({
      category: "Groceries",
      categorySource: "suggested",
    });
  });

  it("suggests the visible category carrying a synonym, such as the default Food for groceries", () => {
    const result = categorizeRow(
      row("REWE Markt 0815"),
      ctx([category("Food"), MISC])
    );

    expect(result).toMatchObject({
      category: "Food",
      categorySource: "suggested",
    });
  });

  it("matches the canonical name and the synonym case-insensitively, returning the user's spelling", () => {
    expect(
      categorizeRow(row("REWE Markt 0815"), ctx([category("groceries"), MISC]))
    ).toMatchObject({ category: "groceries", categorySource: "suggested" });

    expect(
      categorizeRow(row("REWE Markt 0815"), ctx([category("FOOD"), MISC]))
    ).toMatchObject({ category: "FOOD", categorySource: "suggested" });
  });

  it("skips a hidden canonical category for a visible synonym", () => {
    const result = categorizeRow(
      row("REWE Markt 0815"),
      ctx([category("Groceries", true), category("Food"), MISC])
    );

    expect(result).toMatchObject({
      category: "Food",
      categorySource: "suggested",
    });
  });

  it("never suggests a Hidden Category", () => {
    const result = categorizeRow(
      row("REWE Markt 0815"),
      ctx([category("Groceries", true), category("Food", true), MISC])
    );

    expect(result).toMatchObject({
      category: "Miscellaneous",
      categorySource: "unmatched",
    });
  });

  it("takes the first matching group in order, and falls through to the next when the first has no visible category", () => {
    const both = row("REWE Markt 0815", "Netflix Abo");

    expect(
      categorizeRow(
        both,
        ctx([category("Subscriptions"), category("Groceries"), MISC])
      )
    ).toMatchObject({ category: "Groceries", categorySource: "suggested" });

    expect(
      categorizeRow(
        both,
        ctx([category("Subscriptions"), category("Groceries", true), MISC])
      )
    ).toMatchObject({ category: "Subscriptions", categorySource: "suggested" });
  });

  it("finds a keyword in the counterparty alone", () => {
    const result = categorizeRow(
      row("REWE Markt 0815", "Kartenzahlung Filiale 12"),
      ctx([category("Groceries"), MISC])
    );

    expect(result).toMatchObject({
      category: "Groceries",
      categorySource: "suggested",
    });
  });

  it("finds a keyword in the description alone", () => {
    const result = categorizeRow(
      row("MUSTER GMBH", "Kartenzahlung REWE 0815"),
      ctx([category("Groceries"), MISC])
    );

    expect(result).toMatchObject({
      category: "Groceries",
      categorySource: "suggested",
    });
  });

  it("gives a row no group matches Miscellaneous / unmatched, with nothing proposed", () => {
    const everyCanonical = CANONICAL_NAMES.map((name) => category(name));
    const result = categorizeRow(
      row("MUSTER DIENST GMBH", "Rechnung 12"),
      ctx([...everyCanonical, MISC])
    );

    expect(result).toMatchObject({
      category: "Miscellaneous",
      categorySource: "unmatched",
    });
    expect(result.proposedCategory).toBeUndefined();
  });

  it("lets a Category Rule beat a keyword match", () => {
    const rules = new Map([[counterpartyKey("REWE Markt 0815"), "Housing"]]);
    const result = categorizeRow(
      row("REWE Markt 0815"),
      ctx([category("Groceries"), category("Housing"), MISC], rules)
    );

    expect(result).toMatchObject({
      category: "Housing",
      categorySource: "learned",
    });
  });
});
