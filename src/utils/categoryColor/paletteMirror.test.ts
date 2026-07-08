import { describe, it, expect } from "vitest";
import { categoryColorPalette as frontendPalette } from "./categoryColor";
// The server keeps its own copy of the palette so category colours can be
// seeded at write time without a network round-trip. The two files must never
// diverge — this guard fails the build if they do.
import { categoryColorPalette as serverPalette } from "../../../server/src/storage/categoryColors";

describe("category color palette mirror (issue #157)", () => {
  it("holds exactly 20 identical swatches across the server and frontend mirrors", () => {
    expect(frontendPalette).toHaveLength(20);
    expect(serverPalette).toHaveLength(20);
    expect([...frontendPalette]).toEqual([...serverPalette]);
  });
});
