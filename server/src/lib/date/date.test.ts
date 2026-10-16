import { afterEach, describe, it, expect, vi } from "vitest";
import { parseYearMonth, todayIso } from "./date.js";

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

describe("todayIso", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("gives the local date just after midnight", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 16, 0, 30));
    expect(todayIso()).toBe("2026-10-16");
  });

  it("gives the local date just before midnight", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 16, 23, 30));
    expect(todayIso()).toBe("2026-10-16");
  });

  it("pads a single-digit month and day", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 2, 7, 12, 0));
    expect(todayIso()).toBe("2026-03-07");
  });
});
