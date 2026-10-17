import { describe, expect, it } from "vitest";
import { deriveCategoryRules } from "./deriveCategoryRules.js";
import { counterpartyKey } from "./counterpartyKey.js";

// deriveCategoryRules turns the rows of one committed statement into the
// Category Rules that commit teaches: one rule per Counterparty Key, taken from
// teaching rows only. Asserted on the returned rules, sorted by key so the
// order the module emits them in is not part of the contract.

type Source = "learned" | "suggested" | "proposed" | "unmatched" | "chosen";

interface Row {
  date: string;
  counterparty: string;
  category: string;
  categorySource: Source;
}

function row(overrides: Partial<Row>): Row {
  return {
    date: "2026-06-24",
    counterparty: "MUSTER SUPERMARKT GMBH",
    category: "Food",
    categorySource: "chosen",
    ...overrides,
  };
}

const byKey = (rules: Array<{ counterpartyKey: string; category: string }>) =>
  [...rules].sort((a, b) => a.counterpartyKey.localeCompare(b.counterpartyKey));

const SUPERMARKT = counterpartyKey("MUSTER SUPERMARKT GMBH");

describe("deriveCategoryRules", () => {
  it("returns no rules for no rows", () => {
    expect(deriveCategoryRules([])).toEqual([]);
  });

  it("learns from each teaching source: learned, suggested and chosen", () => {
    const rules = deriveCategoryRules([
      row({
        counterparty: "MUSTER SUPERMARKT GMBH",
        categorySource: "learned",
      }),
      row({
        counterparty: "MUSTER STROM AG",
        category: "Housing",
        categorySource: "suggested",
      }),
      row({
        counterparty: "ARBEITGEBER MUSTER AG",
        category: "Income",
        categorySource: "chosen",
      }),
    ]);

    expect(byKey(rules)).toEqual(
      byKey([
        { counterpartyKey: SUPERMARKT, category: "Food" },
        {
          counterpartyKey: counterpartyKey("MUSTER STROM AG"),
          category: "Housing",
        },
        {
          counterpartyKey: counterpartyKey("ARBEITGEBER MUSTER AG"),
          category: "Income",
        },
      ])
    );
  });

  it("learns nothing from an unmatched row", () => {
    expect(
      deriveCategoryRules([
        row({ category: "Miscellaneous", categorySource: "unmatched" }),
      ])
    ).toEqual([]);
  });

  it("learns nothing from an undecided proposed row", () => {
    expect(
      deriveCategoryRules([
        row({ category: "Miscellaneous", categorySource: "proposed" }),
      ])
    ).toEqual([]);
  });

  it("learns a row deliberately set to Miscellaneous", () => {
    expect(
      deriveCategoryRules([
        row({ category: "Miscellaneous", categorySource: "chosen" }),
      ])
    ).toEqual([{ counterpartyKey: SUPERMARKT, category: "Miscellaneous" }]);
  });

  it("skips a teaching row whose counterparty keys to nothing", () => {
    expect(
      deriveCategoryRules([
        row({ counterparty: "", categorySource: "chosen" }),
        row({ counterparty: "555-0000000-0000000", categorySource: "chosen" }),
      ])
    ).toEqual([]);
  });

  it("re-derives the key from the raw counterparty, so noisy spellings of one payee teach one rule", () => {
    const rules = deriveCategoryRules([
      row({ counterparty: "REWE 0815 24.06.2026", category: "Food" }),
      row({ counterparty: "rewe 4711", category: "Food" }),
    ]);

    expect(rules).toEqual([
      { counterpartyKey: counterpartyKey("REWE"), category: "Food" },
    ]);
  });

  it("ignores any key a row carries and keys on the counterparty", () => {
    const rules = deriveCategoryRules([
      {
        ...row({ counterparty: "MUSTER SUPERMARKT GMBH", category: "Food" }),
        counterpartyKey: "muster dienst gmbh",
      } as Row,
    ]);

    expect(rules).toEqual([{ counterpartyKey: SUPERMARKT, category: "Food" }]);
  });

  it("lets the majority category win for one key", () => {
    const rules = deriveCategoryRules([
      row({ date: "2026-06-01", category: "Food" }),
      row({ date: "2026-06-02", category: "Food" }),
      row({ date: "2026-06-30", category: "Shopping" }),
    ]);

    expect(rules).toEqual([{ counterpartyKey: SUPERMARKT, category: "Food" }]);
  });

  it("counts only teaching rows towards the majority", () => {
    const rules = deriveCategoryRules([
      row({ category: "Miscellaneous", categorySource: "unmatched" }),
      row({ category: "Miscellaneous", categorySource: "unmatched" }),
      row({ category: "Food", categorySource: "chosen" }),
    ]);

    expect(rules).toEqual([{ counterpartyKey: SUPERMARKT, category: "Food" }]);
  });

  it("breaks a tie in favour of the category with the latest date", () => {
    const rules = deriveCategoryRules([
      row({ date: "2026-06-20", category: "Shopping" }),
      row({ date: "2026-06-10", category: "Food" }),
    ]);

    expect(rules).toEqual([
      { counterpartyKey: SUPERMARKT, category: "Shopping" },
    ]);
  });

  it("breaks a same-date tie in favour of the later row in the statement", () => {
    const later = deriveCategoryRules([
      row({ date: "2026-06-10", category: "Food" }),
      row({ date: "2026-06-10", category: "Shopping" }),
    ]);
    const earlier = deriveCategoryRules([
      row({ date: "2026-06-10", category: "Shopping" }),
      row({ date: "2026-06-10", category: "Food" }),
    ]);

    expect(later).toEqual([
      { counterpartyKey: SUPERMARKT, category: "Shopping" },
    ]);
    expect(earlier).toEqual([
      { counterpartyKey: SUPERMARKT, category: "Food" },
    ]);
  });

  it("emits exactly one rule per key", () => {
    const rules = deriveCategoryRules([
      row({ counterparty: "MUSTER SUPERMARKT GMBH" }),
      row({ counterparty: "Muster Supermarkt GmbH" }),
      row({ counterparty: "MUSTER DIENST GMBH", category: "Subscriptions" }),
    ]);

    expect(rules).toHaveLength(2);
    expect(new Set(rules.map((r) => r.counterpartyKey)).size).toBe(2);
  });
});
