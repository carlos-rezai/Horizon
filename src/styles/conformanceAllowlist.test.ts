import { describe, it, expect } from "vitest";
import { CONFORMANCE_ALLOWLIST } from "./conformanceAllowlist";

const allowlistSource = Object.values(
  import.meta.glob("./conformanceAllowlist.ts", {
    query: "?raw",
    import: "default",
    eager: true,
  })
)[0] as string;

/**
 * The **Conformance Allowlist** is a ratchet: written from what remained after
 * the UI Consistency Audit fixes (issues #267 to #275), it may only shrink.
 * Lower this ceiling whenever an entry's control moves onto a primitive;
 * never raise it.
 */
const ALLOWLIST_CEILING = 18;

describe("Conformance Allowlist", () => {
  it("names the module, export and reason of every entry", () => {
    expect(CONFORMANCE_ALLOWLIST.length).toBeGreaterThan(0);
    for (const entry of CONFORMANCE_ALLOWLIST) {
      expect(entry.file).toMatch(
        /^(features|components|layouts)\/.+\.styles\.ts$/
      );
      expect(entry.exportName.trim()).not.toBe("");
      expect(entry.reason.trim()).not.toBe("");
    }
  });

  it("lists each export once", () => {
    const keys = CONFORMANCE_ALLOWLIST.map((e) => `${e.file}#${e.exportName}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("is no longer than what remained after the fixes", () => {
    expect(CONFORMANCE_ALLOWLIST.length).toBeLessThanOrEqual(ALLOWLIST_CEILING);
  });

  it("is documented as one that may only shrink", () => {
    expect(allowlistSource).toMatch(/may only shrink/i);
  });
});
