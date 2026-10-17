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

function ctx(
  categories: Category[],
  categoryRules: Map<string, string> = new Map()
) {
  return { categoryRules, categories, declined: new Set<string>() };
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

// ---------------------------------------------------------------------------
// Issue #261 — Import Category Learning, Phase 2: rules follow categories.
//
// A safety net behind the cascades: a Category Rule whose category no longer
// exists is ignored, so a stale rule never assigns a missing category. The row
// falls through the normal precedence — Keyword Group, then Miscellaneous.
// ---------------------------------------------------------------------------

describe("categorizeRow — dangling Category Rule (#261)", () => {
  it("skips a Category Rule whose category no longer exists and falls through to a Keyword Group", () => {
    const rules = new Map([[counterpartyKey("REWE Markt 0815"), "Pets"]]);
    const result = categorizeRow(
      row("REWE Markt 0815"),
      ctx([category("Groceries"), MISC], rules)
    );

    expect(result).toMatchObject({
      category: "Groceries",
      categorySource: "suggested",
    });
  });

  it("skips a Category Rule whose category no longer exists and falls back to Miscellaneous", () => {
    const rules = new Map([[counterpartyKey("Muster Tierarzt"), "Pets"]]);
    const result = categorizeRow(
      row("Muster Tierarzt"),
      ctx([category("Groceries"), MISC], rules)
    );

    expect(result).toEqual({
      category: "Miscellaneous",
      categorySource: "unmatched",
    });
  });
});

// ---------------------------------------------------------------------------
// Issue #262 — Import Category Learning, Phase 4: Category Proposals.
//
// When a Keyword Group matches but the user has no visible category for it,
// the row stays in Miscellaneous with the source `proposed` and carries the
// group's canonical name as its proposal. A canonical name the user declined,
// or one a Hidden Category already holds, is never proposed: the next group is
// tried instead. Proposals only ever name a shipped canonical category, never
// the merchant.
// ---------------------------------------------------------------------------

function ctxDeclined(categories: Category[], declined: string[]) {
  return {
    categoryRules: new Map<string, string>(),
    categories,
    declined: new Set(declined),
  };
}

describe("categorizeRow — Category Proposals (#262)", () => {
  it("proposes the group's canonical name when the user has no category for it", () => {
    const result = categorizeRow(
      row("REWE Markt 0815"),
      ctx([category("Housing"), MISC])
    );

    expect(result).toEqual({
      category: "Miscellaneous",
      categorySource: "proposed",
      proposedCategory: "Groceries",
    });
  });

  it("prefers a visible synonym over a proposal", () => {
    const result = categorizeRow(
      row("REWE Markt 0815"),
      ctx([category("Food"), MISC])
    );

    expect(result).toMatchObject({
      category: "Food",
      categorySource: "suggested",
    });
    expect(result.proposedCategory).toBeUndefined();
    // Control: without Food, the canonical name is proposed.
    expect(
      categorizeRow(row("REWE Markt 0815"), ctx([MISC])).proposedCategory
    ).toBe("Groceries");
  });

  it("does not propose a declined canonical name and falls through to the next group", () => {
    const result = categorizeRow(
      row("REWE Markt 0815", "Netflix Abo"),
      ctxDeclined([category("Subscriptions"), MISC], ["groceries"])
    );

    expect(result).toMatchObject({
      category: "Subscriptions",
      categorySource: "suggested",
    });
    expect(result.proposedCategory).toBeUndefined();
    // Control: undeclined, the first group's missing category is proposed.
    expect(
      categorizeRow(
        row("REWE Markt 0815", "Netflix Abo"),
        ctx([category("Subscriptions"), MISC])
      )
    ).toMatchObject({
      categorySource: "proposed",
      proposedCategory: "Groceries",
    });
  });

  it("proposes the next group when the first group's name was declined and the next is missing too", () => {
    const result = categorizeRow(
      row("REWE Markt 0815", "Netflix Abo"),
      ctxDeclined([MISC], ["groceries"])
    );

    expect(result).toEqual({
      category: "Miscellaneous",
      categorySource: "proposed",
      proposedCategory: "Subscriptions",
    });
  });

  it("gives Miscellaneous / unmatched when the only matching group was declined", () => {
    const result = categorizeRow(
      row("REWE Markt 0815"),
      ctxDeclined([MISC], ["groceries"])
    );

    expect(result).toEqual({
      category: "Miscellaneous",
      categorySource: "unmatched",
    });
    // Control: a different declined name does not suppress Groceries.
    expect(
      categorizeRow(row("REWE Markt 0815"), ctxDeclined([MISC], ["dining"]))
        .proposedCategory
    ).toBe("Groceries");
  });

  it("does not propose a canonical name a Hidden Category holds, and falls through to the next group", () => {
    const result = categorizeRow(
      row("REWE Markt 0815", "Netflix Abo"),
      ctx([category("Groceries", true), MISC])
    );

    expect(result).toEqual({
      category: "Miscellaneous",
      categorySource: "proposed",
      proposedCategory: "Subscriptions",
    });
  });

  it("does not propose a canonical name a Hidden Category holds in another case", () => {
    const result = categorizeRow(
      row("REWE Markt 0815"),
      ctx([category("groceries", true), MISC])
    );

    expect(result).toEqual({
      category: "Miscellaneous",
      categorySource: "unmatched",
    });
    // Control: an unrelated Hidden Category does not block the proposal.
    expect(
      categorizeRow(row("REWE Markt 0815"), ctx([category("Pets", true), MISC]))
        .proposedCategory
    ).toBe("Groceries");
  });

  it("lets a Category Rule beat a proposal", () => {
    const rules = new Map([[counterpartyKey("REWE Markt 0815"), "Housing"]]);
    const result = categorizeRow(
      row("REWE Markt 0815"),
      ctx([category("Housing"), MISC], rules)
    );

    expect(result).toEqual({ category: "Housing", categorySource: "learned" });
    // Control: without the rule, the same row is proposed.
    expect(
      categorizeRow(row("REWE Markt 0815"), ctx([category("Housing"), MISC]))
        .proposedCategory
    ).toBe("Groceries");
  });

  it("only ever proposes a shipped canonical name, never the merchant", () => {
    const payees = KEYWORD_GROUPS.map((group) => group.keywords[0]);

    for (const payee of payees) {
      const result = categorizeRow(
        row(`${payee.toUpperCase()} 0815`),
        ctx([MISC])
      );

      expect(result.categorySource, payee).toBe("proposed");
      expect(CANONICAL_NAMES, payee).toContain(result.proposedCategory);
      expect(result.category, payee).toBe("Miscellaneous");
    }
  });
});
