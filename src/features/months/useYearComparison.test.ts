// @vitest-environment jsdom
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useYearComparison } from "./useYearComparison";

const ROWS = [
  { category: "Groceries", thisYear: 12000, lastYear: 9000 },
  { category: "Dining", thisYear: 8000, lastYear: 8500 },
];

function mockFetchOk(month = "2026-06") {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = typeof input === "string" ? input : input.toString();
    const m = url.match(/month=([\d-]+)/)?.[1] ?? month;
    return {
      ok: true,
      json: async () => ({ month: m, rows: ROWS }),
    } as Response;
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useYearComparison — fetch", () => {
  beforeEach(() => mockFetchOk());

  it("fetches GET /reports/year-comparison?month=YYYY-MM for the viewed month", async () => {
    renderHook(() => useYearComparison("2026-06"));

    await act(async () => {});

    const calls = vi
      .mocked(fetch)
      .mock.calls.map(([url]) =>
        typeof url === "string" ? url : url.toString()
      );

    expect(
      calls.some(
        (url) =>
          url.includes("/reports/year-comparison") &&
          url.includes("month=2026-06")
      )
    ).toBe(true);
  });

  it("returns the rows from the response", async () => {
    const { result } = renderHook(() => useYearComparison("2026-06"));

    await act(async () => {});

    expect(result.current.rows).toEqual(ROWS);
  });
});

describe("useYearComparison — loading state", () => {
  it("isLoading is true before the fetch resolves", () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      () => new Promise(() => {})
    );

    const { result } = renderHook(() => useYearComparison("2026-06"));

    expect(result.current.isLoading).toBe(true);
  });

  it("isLoading is false after the fetch resolves", async () => {
    mockFetchOk();
    const { result } = renderHook(() => useYearComparison("2026-06"));

    await act(async () => {});

    expect(result.current.isLoading).toBe(false);
  });
});

describe("useYearComparison — refetch on month change", () => {
  beforeEach(() => mockFetchOk());

  it("refetches for the new month when the viewed month changes", async () => {
    const { rerender } = renderHook(({ month }) => useYearComparison(month), {
      initialProps: { month: "2026-06" },
    });

    await act(async () => {});
    const callsBefore = vi.mocked(fetch).mock.calls.length;

    rerender({ month: "2026-07" });
    await act(async () => {});

    const calls = vi
      .mocked(fetch)
      .mock.calls.map(([url]) =>
        typeof url === "string" ? url : url.toString()
      );

    expect(vi.mocked(fetch).mock.calls.length).toBeGreaterThan(callsBefore);
    expect(calls.some((url) => url.includes("month=2026-07"))).toBe(true);
  });
});
