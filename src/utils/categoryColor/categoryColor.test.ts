import { describe, it, expect } from "vitest";
import { categoryColorPalette, colorForCategoryName } from "./categoryColor";

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

  it("mirrors the server's name-hash mapping", () => {
    // Pinned against the server's colorForCategoryName output so frontend
    // swatches match the colour persisted/returned by GET /categories.
    expect(colorForCategoryName("Cat")).toBe("#7FA7D9");
    expect(colorForCategoryName("Food")).toBe("#C9897F");
  });
});
