import { describe, it, expect, afterEach, vi } from "vitest";
import { currentMonth, monthsBetween, todayIso } from "./monthMath";

describe("currentMonth", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("is this month as YYYY-MM", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 9, 16, 12));

    expect(currentMonth()).toBe("2026-10");
  });

  it("zero-pads a single-digit month", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2027, 0, 3, 12));

    expect(currentMonth()).toBe("2027-01");
  });
});

describe("monthsBetween", () => {
  it("counts whole months within a year", () => {
    expect(monthsBetween("2026-03", "2026-10")).toBe(7);
  });

  it("counts across year boundaries", () => {
    expect(monthsBetween("2026-10", "2031-10")).toBe(60);
    expect(monthsBetween("2026-11", "2027-02")).toBe(3);
  });

  it("is 0 for the same month", () => {
    expect(monthsBetween("2026-10", "2026-10")).toBe(0);
  });

  it("is negative when the target is earlier", () => {
    expect(monthsBetween("2027-02", "2026-11")).toBe(-3);
  });
});

describe("todayIso", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("is today's local date as YYYY-MM-DD", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 2, 7, 12));

    expect(todayIso()).toBe("2026-03-07");
  });
});
