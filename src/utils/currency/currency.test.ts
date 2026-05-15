import { describe, it, expect } from "vitest";
import { eurosToCents, centsToEuros } from "./currency";

describe("eurosToCents", () => {
  it("converts a standard euro amount to cents", () => {
    expect(eurosToCents("10.00")).toBe(1000);
  });

  it("converts a single cent amount", () => {
    expect(eurosToCents("0.01")).toBe(1);
  });

  it("converts a negative euro amount to negative cents", () => {
    expect(eurosToCents("-5.50")).toBe(-550);
  });

  it("converts zero", () => {
    expect(eurosToCents("0")).toBe(0);
  });

  it("uses Math.round so values slightly below a whole cent round up correctly", () => {
    // 0.3 in IEEE 754 is 0.2999999..., so 0.3 * 100 = 29.9999...
    // Math.round gives 30; Math.floor would give 29
    expect(eurosToCents("0.30")).toBe(30);
  });

  it("rounds a half-cent input to the nearest cent", () => {
    // 1.005 * 100 = 100.5 — Math.round gives 101
    expect(eurosToCents("1.005")).toBe(101);
  });
});

describe("centsToEuros", () => {
  it("converts cents back to a euro decimal string", () => {
    expect(centsToEuros(1000)).toBe("10.00");
  });

  it("converts a single cent", () => {
    expect(centsToEuros(1)).toBe("0.01");
  });

  it("converts negative cents", () => {
    expect(centsToEuros(-550)).toBe("-5.50");
  });

  it("converts zero", () => {
    expect(centsToEuros(0)).toBe("0.00");
  });
});
