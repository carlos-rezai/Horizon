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

  it("rounds to the nearest cent to avoid floating-point drift", () => {
    // Math.round(1.005 * 100) should be 101, not 100
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
