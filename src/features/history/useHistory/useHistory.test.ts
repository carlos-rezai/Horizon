// @vitest-environment jsdom
import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import CacheProvider from "../../../components/CacheProvider/CacheProvider";
import { useHistory } from "./useHistory";
import { useSavingsGoal } from "../../savings/useSavingsGoal/useSavingsGoal";
import {
  noRow,
  useOptimisticCommit,
} from "../../months/useOptimisticCommit/useOptimisticCommit";

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
// two statements that share the 2023 startDate year, to prove the hook counts
// statements per year.
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
    renderHook(() => useHistory(), { wrapper: CacheProvider });

    await act(async () => {});

    const calls = vi
      .mocked(fetch)
      .mock.calls.map(([url]) =>
        typeof url === "string" ? url : url.toString()
      );

    expect(calls.some((url) => url.includes("/projection/history"))).toBe(true);
  });

  it("fetches GET /imports", async () => {
    renderHook(() => useHistory(), { wrapper: CacheProvider });

    await act(async () => {});

    const calls = vi
      .mocked(fetch)
      .mock.calls.map(([url]) =>
        typeof url === "string" ? url : url.toString()
      );

    expect(calls.some((url) => url.includes("/imports"))).toBe(true);
  });

  it("exposes the reconstructed points from /projection/history", async () => {
    const { result } = renderHook(() => useHistory(), {
      wrapper: CacheProvider,
    });

    await act(async () => {});

    expect(result.current.points).toEqual(POINTS);
  });

  it("derives per-year statement counts from the import startDates", async () => {
    const { result } = renderHook(() => useHistory(), {
      wrapper: CacheProvider,
    });

    await act(async () => {});

    // IMPORTS has two 2023 statements and one 2021 statement.
    expect(result.current.statementCounts).toEqual({ 2021: 1, 2023: 2 });
  });
});

describe("useHistory — no imports", () => {
  beforeEach(() => mockFetch([], []));

  it("returns empty points and counts when there are no imports", async () => {
    const { result } = renderHook(() => useHistory(), {
      wrapper: CacheProvider,
    });

    await act(async () => {});

    expect(result.current.points).toEqual([]);
    expect(result.current.statementCounts).toEqual({});
    expect(result.current.error).toBeNull();
  });
});

describe("useHistory — loading state", () => {
  it("isLoading is true before the fetches resolve", () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      () => new Promise(() => {})
    );

    const { result } = renderHook(() => useHistory(), {
      wrapper: CacheProvider,
    });

    expect(result.current.isLoading).toBe(true);
  });

  it("isLoading is false after the fetches resolve", async () => {
    mockFetch();
    const { result } = renderHook(() => useHistory(), {
      wrapper: CacheProvider,
    });

    await act(async () => {});

    expect(result.current.isLoading).toBe(false);
  });
});

describe("useHistory — failure path", () => {
  it("sets error and clears isLoading when a request rejects", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("network down"));

    const { result } = renderHook(() => useHistory(), {
      wrapper: CacheProvider,
    });

    await act(async () => {});

    expect(result.current.error).not.toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.points).toEqual([]);
  });

  it("leaves error null on a successful response", async () => {
    mockFetch();

    const { result } = renderHook(() => useHistory(), {
      wrapper: CacheProvider,
    });

    await act(async () => {});

    expect(result.current.error).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// History as a cached resource (#241). The History points are one `HISTORY`
// cache entry, so every reader shares a request and every mutation that makes
// the projection stale makes history stale with it.
// ---------------------------------------------------------------------------

/** How many GET /projection/history requests have been made so far. */
function historyRequestCount(): number {
  return vi
    .mocked(fetch)
    .mock.calls.map(([url]) => (typeof url === "string" ? url : url.toString()))
    .filter((url) => url.includes("/projection/history")).length;
}

describe("useHistory — cached resource", () => {
  it("shares one /projection/history fetch with useSavingsGoal when both are mounted", async () => {
    mockFetch();

    renderHook(() => ({ history: useHistory(), savings: useSavingsGoal() }), {
      wrapper: CacheProvider,
    });

    await act(async () => {});

    expect(historyRequestCount()).toBe(1);
  });

  it("refetches history when a projection-affecting mutation lands", async () => {
    const UPDATED_POINTS = [
      ...POINTS,
      {
        month: "2023-05",
        totalLiquid: 540000,
        restschuld: 19800000,
        netCashflow: 20000,
        accounts: { "acc-1": 540000 },
      },
    ];
    let historyCalls = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/projection/history")) {
        historyCalls += 1;
        const points = historyCalls === 1 ? POINTS : UPDATED_POINTS;
        return { ok: true, json: async () => points } as Response;
      }
      if (url.includes("/imports")) {
        return { ok: true, json: async () => IMPORTS } as Response;
      }
      return { ok: true, json: async () => [] } as Response;
    });

    const { result } = renderHook(
      () => ({
        history: useHistory(),
        commit: useOptimisticCommit(() => {}),
      }),
      { wrapper: CacheProvider }
    );

    await waitFor(() => {
      expect(result.current.history.points).toEqual(POINTS);
    });

    // An expense recorded on the Month page: it moves money, so it bumps the
    // projection — and history must follow.
    await act(async () => {
      await result.current.commit(
        { next: [], rollback: [], settle: () => [] },
        async () => ({ ok: true }) as Response,
        noRow,
        "Failed to save"
      );
    });

    await waitFor(() => {
      expect(result.current.history.points).toEqual(UPDATED_POINTS);
    });
    expect(historyRequestCount()).toBe(2);
  });
});
