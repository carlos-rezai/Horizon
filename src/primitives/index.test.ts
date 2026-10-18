import { describe, it, expect } from "vitest";
import * as primitives from "./index";

// Audit Finding 35 — the layer index lists every primitive. Each PascalCase
// folder's component, loaded by Vite, is the very value the index exports
// under the folder's name.
const components = Object.fromEntries(
  Object.entries(
    import.meta.glob(["./*/*.tsx", "!./**/*.test.tsx"], {
      import: "default",
      eager: true,
    })
  )
    .map(([path, component]) => [path.split("/"), component] as const)
    .filter(([[, folder, file]]) => file === `${folder}.tsx`)
    .map(([[, folder], component]) => [folder, component])
);

describe("primitives index", () => {
  it("exports every primitive folder's component under its name", () => {
    expect(Object.keys(components).length).toBeGreaterThan(18);
    const exported = primitives as Record<string, unknown>;
    Object.entries(components).forEach(([folder, component]) => {
      expect(exported[folder], folder).toBe(component);
    });
  });
});
