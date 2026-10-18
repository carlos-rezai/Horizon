import { describe, it, expect } from "vitest";
import {
  findConformanceViolations,
  findStaleAllowlistEntries,
  findFocusRingViolations,
  findStyledElements,
  wearsFocusRing,
} from "../testing/rawControls/rawControls";
import { CONFORMANCE_ALLOWLIST } from "./conformanceAllowlist";

// Read through Vite rather than the filesystem, as the font-faces test does,
// so the guard sees exactly the style modules the bundler sees.
const rawModules = import.meta.glob(
  [
    "../features/**/*.styles.ts",
    "../components/**/*.styles.ts",
    "../layouts/**/*.styles.ts",
  ],
  { query: "?raw", import: "default", eager: true }
) as Record<string, string>;

// Keys arrive as `../features/...`; the allowlist names modules from `src/`.
const styleModules: Record<string, string> = Object.fromEntries(
  Object.entries(rawModules).map(([path, source]) => [
    path.replace(/^\.\.\//, ""),
    source,
  ])
);

/**
 * **Primitive Conformance**: outside `primitives/`, a raw `button`, `input`,
 * `select` or `textarea` styled element is either a primitive waiting to be
 * used or a **Conformance Allowlist** entry with its reason.
 */
describe("Primitive Conformance", () => {
  it("reads the feature, component and layout style modules", () => {
    const files = Object.keys(styleModules);
    expect(files.some((f) => f.startsWith("features/"))).toBe(true);
    expect(files.some((f) => f.startsWith("components/"))).toBe(true);
    expect(files.some((f) => f.startsWith("layouts/"))).toBe(true);
  });

  it("finds no raw control outside the allowlist", () => {
    expect(
      findConformanceViolations(styleModules, CONFORMANCE_ALLOWLIST)
    ).toEqual([]);
  });

  it("holds no entry whose raw control is gone", () => {
    expect(
      findStaleAllowlistEntries(styleModules, CONFORMANCE_ALLOWLIST)
    ).toEqual([]);
  });
});

// The Focus Ring rule reaches into `primitives/` too: a primitive's own
// buttons wear the fragment as much as a feature's do.
const ringModules = import.meta.glob(
  [
    "../features/**/*.styles.ts",
    "../components/**/*.styles.ts",
    "../layouts/**/*.styles.ts",
    "../primitives/**/*.styles.ts",
  ],
  { query: "?raw", import: "default", eager: true }
) as Record<string, string>;

/**
 * **Primitive Conformance** — the **Focus Ring**: every styled button composes
 * the `focusRing` fragment. A hand-written copy of the gold ring does not
 * pass, so the ring keeps one owner.
 */
describe("Primitive Conformance — Focus Ring", () => {
  it("reads the primitive style modules as well", () => {
    expect(
      Object.keys(ringModules).some((f) => f.startsWith("../primitives/"))
    ).toBe(true);
  });

  it("finds no styled button without the Focus Ring", () => {
    expect(findFocusRingViolations(ringModules)).toEqual([]);
  });

  it("a clickable DataRow, rendered as a div, wears the Focus Ring too", () => {
    const dataRow = findStyledElements(
      ringModules["../components/DataRow/DataRow.styles.ts"] ?? ""
    ).find((element) => element.exportName === "StyledDataRow");
    expect(dataRow).toBeDefined();
    expect(wearsFocusRing(dataRow?.body ?? "")).toBe(true);
  });
});
