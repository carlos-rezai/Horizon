import { afterEach, describe, it, expect, vi } from "vitest";
import { daysInMonth, endOfMonth, parseYearMonth, todayIso } from "./date.js";

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

describe("daysInMonth", () => {
  it("gives 29 for February in a leap year", () => {
    expect(daysInMonth("2028-02")).toBe(29);
  });

  it("gives 28 for February in a common year", () => {
    expect(daysInMonth("2026-02")).toBe(28);
  });

  it("gives 30 for a 30-day month", () => {
    expect(daysInMonth("2026-04")).toBe(30);
  });

  it("gives 31 for a 31-day month", () => {
    expect(daysInMonth("2026-12")).toBe(31);
  });
});

describe("endOfMonth", () => {
  it("gives the 29th of February in a leap year", () => {
    expect(endOfMonth("2028-02")).toBe("2028-02-29");
  });

  it("gives the 28th of February in a common year", () => {
    expect(endOfMonth("2026-02")).toBe("2026-02-28");
  });

  it("gives the 30th of a 30-day month", () => {
    expect(endOfMonth("2026-04")).toBe("2026-04-30");
  });

  it("gives the 31st of a 31-day month", () => {
    expect(endOfMonth("2026-12")).toBe("2026-12-31");
  });
});
