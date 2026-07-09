import { describe, it, expect } from "vitest";
import type { Transaction } from "../../types/transaction";
import type { Category } from "../../types/category";
import { deriveBreakdown } from "./monthBreakdown";
import { colorForCategoryName } from "../categoryColor/categoryColor";

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: Math.random().toString(36).slice(2),
    accountId: "a1",
    date: "2026-06-03",
    amount: -1000,
    description: "Expense",
    category: "Food",
    ...overrides,
  };
}

describe("deriveBreakdown", () => {
  it("groups variable spending by category into positive-magnitude slices", () => {
    const txns = [
      tx({ amount: -5000, category: "Groceries" }),
      tx({ amount: -1000, category: "Groceries" }),
      tx({ amount: -3000, category: "Dining" }),
    ];
    const { segments } = deriveBreakdown(txns);
    const groceries = segments.find((s) => s.label === "Groceries");
    expect(groceries?.amount).toBe(6000);
    const dining = segments.find((s) => s.label === "Dining");
    expect(dining?.amount).toBe(3000);
  });

  it("sorts slices descending by amount", () => {
    const txns = [
      tx({ amount: -2000, category: "Cat" }),
      tx({ amount: -6000, category: "Groceries" }),
      tx({ amount: -3000, category: "Dining" }),
    ];
    const { segments } = deriveBreakdown(txns);
    expect(segments.map((s) => s.label)).toEqual([
      "Groceries",
      "Dining",
      "Cat",
    ]);
  });

  it("resolves each slice colour from the category name", () => {
    const txns = [tx({ amount: -5000, category: "Groceries" })];
    const { segments } = deriveBreakdown(txns);
    expect(segments[0].color).toBe(colorForCategoryName("Groceries"));
  });

  it("totals the magnitudes of every slice", () => {
    const txns = [
      tx({ amount: -5000, category: "Groceries" }),
      tx({ amount: -3000, category: "Dining" }),
    ];
    expect(deriveBreakdown(txns).total).toBe(8000);
  });

  it("excludes transfers and auto-settlement", () => {
    const txns = [
      tx({ amount: -5000, category: "Groceries" }),
      tx({ amount: -90000, category: "Groceries", transferId: "tr1" }),
      tx({ amount: -90000, category: "Dining", isAutoSettlement: true }),
    ];
    const { segments, total } = deriveBreakdown(txns);
    expect(segments).toHaveLength(1);
    expect(total).toBe(5000);
  });

  it("returns empty segments and zero total for an empty month", () => {
    expect(deriveBreakdown([])).toEqual({ segments: [], total: 0 });
  });

  // --- authoritative category colour (issue #157) ---------------------------

  it("reads each slice colour from the matching category, falling back to the name hash", () => {
    // Stored #111111 for Groceries differs from its name-hash so the stored
    // value winning is unambiguous; Dining is absent and must fall back.
    const categories: Category[] = [
      {
        id: "1",
        name: "Groceries",
        isDefault: true,
        color: "#111111",
        hidden: false,
      },
    ];
    const txns = [
      tx({ amount: -5000, category: "Groceries" }),
      tx({ amount: -3000, category: "Dining" }),
    ];

    const { segments } = deriveBreakdown(txns, categories);
    const groceries = segments.find((s) => s.label === "Groceries");
    const dining = segments.find((s) => s.label === "Dining");

    expect(groceries?.color).toBe("#111111");
    expect(dining?.color).toBe(colorForCategoryName("Dining"));
  });

  // --- hidden is picker-only, never a data filter (issue #162) --------------

  it("still includes spending for a category flagged hidden", () => {
    // Hiding a Default Category removes it from the pickers, but its spend must
    // keep showing in the breakdown donut — hidden is never a data filter.
    const categories: Category[] = [
      {
        id: "1",
        name: "Groceries",
        isDefault: true,
        color: "#111111",
        hidden: true,
      },
    ];
    const txns = [
      tx({ amount: -5000, category: "Groceries" }),
      tx({ amount: -3000, category: "Dining" }),
    ];

    const { segments, total } = deriveBreakdown(txns, categories);
    const groceries = segments.find((s) => s.label === "Groceries");

    expect(groceries?.amount).toBe(5000);
    // the hidden category keeps its authoritative stored colour, too
    expect(groceries?.color).toBe("#111111");
    expect(total).toBe(8000);
  });
});
