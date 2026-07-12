// @vitest-environment jsdom
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useHistory } from "./useHistory";

// Reconstructed points as returned by GET /projection/history.
const POINTS = [
  {
    month: "2023-03",
    totalLiquid: 500000,
    restschuld: 20000000,
    netCashflow: 120000,
    accounts: { "acc-1": 500000 },
  },
  {
    month: "2023-04",
    totalLiquid: 520000,
    restschuld: 19900000,
    netCashflow: 20000,
    accounts: { "acc-1": 520000 },
  },
];

// Import records as returned by GET /imports — deliberately out of order, with
// two statements that share the 2023 startDate year, to prove the hook derives
// distinct years and sorts them ascending.
const IMPORTS = [
  { id: "imp-1", startDate: "2023-03-15" },
  { id: "imp-2", startDate: "2021-11-02" },
  { id: "imp-3", startDate: "2023-01-05" },
];

function mockFetch(points: unknown = POINTS, imports: unknown = IMPORTS) {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url.includes("/projection/history")) {
      return { ok: true, json: async () => points } as Response;
    }
    if (url.includes("/imports")) {
      return { ok: true, json: async () => imports } as Response;
    }
    return { ok: true, json: async () => [] } as Response;
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useHistory — fetch", () => {
  beforeEach(() => mockFetch());

  it("fetches GET /projection/history", async () => {
    renderHook(() => useHistory());

    await act(async () => {});

    const calls = vi
      .mocked(fetch)
      .mock.calls.map(([url]) =>
        typeof url === "string" ? url : url.toString()
      );

    expect(calls.some((url) => url.includes("/projection/history"))).toBe(true);
  });

  it("fetches GET /imports", async () => {
    renderHook(() => useHistory());

    await act(async () => {});

    const calls = vi
      .mocked(fetch)
      .mock.calls.map(([url]) =>
        typeof url === "string" ? url : url.toString()
      );

    expect(calls.some((url) => url.includes("/imports"))).toBe(true);
  });

  it("exposes the reconstructed points from /projection/history", async () => {
    const { result } = renderHook(() => useHistory());

    await act(async () => {});

    expect(result.current.points).toEqual(POINTS);
  });

  it("derives distinct years-with-imports ascending from the import startDates", async () => {
    const { result } = renderHook(() => useHistory());

    await act(async () => {});

    expect(result.current.years).toEqual([2021, 2023]);
  });
});

describe("useHistory — no imports", () => {
  beforeEach(() => mockFetch([], []));

  it("returns empty points and years when there are no imports", async () => {
    const { result } = renderHook(() => useHistory());

    await act(async () => {});

    expect(result.current.points).toEqual([]);
    expect(result.current.years).toEqual([]);
    expect(result.current.error).toBeNull();
  });
});

describe("useHistory — loading state", () => {
  it("isLoading is true before the fetches resolve", () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      () => new Promise(() => {})
    );

    const { result } = renderHook(() => useHistory());

    expect(result.current.isLoading).toBe(true);
  });

  it("isLoading is false after the fetches resolve", async () => {
    mockFetch();
    const { result } = renderHook(() => useHistory());

    await act(async () => {});

    expect(result.current.isLoading).toBe(false);
  });
});

describe("useHistory — failure path", () => {
  it("sets error and clears isLoading when a request rejects", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"));

    const { result } = renderHook(() => useHistory());

    await act(async () => {});

    expect(result.current.error).not.toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.points).toEqual([]);
    expect(result.current.years).toEqual([]);
  });

  it("leaves error null on a successful response", async () => {
    mockFetch();

    const { result } = renderHook(() => useHistory());

    await act(async () => {});

    expect(result.current.error).toBeNull();
  });
});
