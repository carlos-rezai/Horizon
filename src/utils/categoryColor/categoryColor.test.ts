import { describe, it, expect } from "vitest";
import type { Category } from "../../types/category";
import {
  categoryColorPalette,
  colorForCategoryName,
  resolveCategoryColor,
} from "./categoryColor";

describe("colorForCategoryName", () => {
  it("is deterministic — the same name always maps to the same colour", () => {
    expect(colorForCategoryName("Groceries")).toBe(
      colorForCategoryName("Groceries")
    );
  });

  it("always returns a colour from the palette", () => {
    for (const name of ["Cat", "Dining", "Health", "Transport", "Shopping"]) {
      expect(categoryColorPalette).toContain(colorForCategoryName(name));
    }
  });

  it("pins the canonical breakdown categories to their prototype colours", () => {
    // The Month Overview breakdown categories carry fixed, hand-authored
    // swatches (docs/handoff prototype) so the donut + badges read 1:1.
    expect(colorForCategoryName("Groceries")).toBe("#74C29B"); // sage
    expect(colorForCategoryName("Dining")).toBe("#E0A86B"); // clay
    expect(colorForCategoryName("Transport")).toBe("#7FA7D9"); // steel
    expect(colorForCategoryName("Shopping")).toBe("#B79CE0"); // lilac
    expect(colorForCategoryName("Health")).toBe("#5FB8C0"); // teal
    expect(colorForCategoryName("Cat")).toBe("#C7AE57"); // ochre
    expect(colorForCategoryName("Misc")).toBe("#909AAE"); // slate
  });

  it("falls back to the name-hash for categories outside the fixed map", () => {
    // Mirrors the server: an unmapped name hashes deterministically so frontend
    // swatches match the colour persisted/returned by GET /categories.
    expect(colorForCategoryName("Food")).toBe("#C9897F");
  });
});

describe("resolveCategoryColor (issue #157)", () => {
  // Stored `#123456` for Food deliberately differs from its name-hash
  // (#C9897F) so a passing test can only mean the stored value won, not the
  // derived one.
  const categories: Category[] = [
    { id: "1", name: "Food", isDefault: true, color: "#123456", hidden: false },
    { id: "2", name: "Vet", isDefault: false, color: "#abcdef", hidden: false },
  ];

  it("returns the matching category's stored colour", () => {
    expect(resolveCategoryColor("Food", categories)).toBe("#123456");
    expect(resolveCategoryColor("Vet", categories)).toBe("#abcdef");
  });

  it("prefers the stored colour over the name-derived colour — colour is authoritative", () => {
    expect(resolveCategoryColor("Food", categories)).not.toBe(
      colorForCategoryName("Food")
    );
    expect(resolveCategoryColor("Food", categories)).toBe("#123456");
  });

  it("falls back to colorForCategoryName when no category matches (fresh install / unknown name)", () => {
    // colorForCategoryName is now only the NULL/absent fallback.
    expect(resolveCategoryColor("Groceries", categories)).toBe(
      colorForCategoryName("Groceries")
    );
    expect(resolveCategoryColor("Anything", [])).toBe(
      colorForCategoryName("Anything")
    );
  });
});
