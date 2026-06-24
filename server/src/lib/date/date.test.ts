import { describe, it, expect } from "vitest";
import { parseYearMonth } from "./date.js";

describe("parseYearMonth", () => {
  it("parses a plain YYYY-MM value", () => {
    expect(parseYearMonth("2026-11")).toEqual({ year: 2026, month: 11 });
  });

  it("strips the leading zero from a single-digit month", () => {
    expect(parseYearMonth("2026-03")).toEqual({ year: 2026, month: 3 });
  });

  it("ignores the trailing day in a full YYYY-MM-DD date", () => {
    expect(parseYearMonth("2026-03-15")).toEqual({ year: 2026, month: 3 });
  });

  it("ignores the day on the last day of a month", () => {
    expect(parseYearMonth("2025-12-31")).toEqual({ year: 2025, month: 12 });
  });
});
