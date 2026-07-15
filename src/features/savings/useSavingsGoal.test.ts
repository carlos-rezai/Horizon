// @vitest-environment jsdom
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { useSavingsGoal } from "./useSavingsGoal";
import type { SavingsGoalConfig } from "./savingsTypes";

// ---------------------------------------------------------------------------
// useSavingsGoal — read-only in Phase 1. It derives the trackable account ids
// (Girokonto | Tagesgeld | Investment, in account order; Mortgage/CreditCard
// excluded), pairs the saved config with the reconstructed history points, runs
// computeSavingsGoal, and exposes { goal, isLoading }. The save path arrives in
// Phase 3.
// ---------------------------------------------------------------------------

// Two trackable accounts (Girokonto + Investment) and one Mortgage that must be
// excluded from the streak entirely.
const ACCOUNTS = [
  {
    id: "a1",
    kind: "Girokonto",
    name: "Main",
    openingBalance: 0,
    openingDate: "2026-01-01",
    balance: 0,
  },
  {
    id: "a2",
    kind: "Investment",
    name: "ETF",
    openingBalance: 0,
    openingDate: "2026-01-01",
    balance: 0,
  },
  {
    id: "m1",
    kind: "Mortgage",
    name: "Home",
    openingBalance: 0,
    openingDate: "2026-01-01",
    balance: 0,
  },
];

// Both tracked accounts grow by exactly €100 for two consecutive months.
const POINTS = [
  {
    month: "2026-01",
    totalLiquid: 0,
    restschuld: 0,
    netCashflow: 0,
    accounts: { a1: 0, a2: 0, m1: 0 },
  },
  {
    month: "2026-02",
    totalLiquid: 20000,
    restschuld: 0,
    netCashflow: 0,
    accounts: { a1: 10000, a2: 10000, m1: 0 },
  },
  {
    month: "2026-03",
    totalLiquid: 40000,
    restschuld: 0,
    netCashflow: 0,
    accounts: { a1: 20000, a2: 20000, m1: 0 },
  },
];

const IMPORTS = [{ id: "imp-1", startDate: "2026-01-01" }];

const CONFIG: SavingsGoalConfig = {
  mode: "manual",
  targetTotal: 0,
  targetDate: "2026-12",
  startedAt: "2026-01",
  manualMonthly: { a1: 10000, a2: 10000 },
};

function mockFetch(config: unknown = CONFIG) {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url.includes("/savings-goal")) {
      return { ok: true, json: async () => config } as Response;
    }
    if (url.includes("/projection/history")) {
      return { ok: true, json: async () => POINTS } as Response;
    }
    if (url.includes("/imports")) {
      return { ok: true, json: async () => IMPORTS } as Response;
    }
    if (url.includes("/accounts")) {
      return { ok: true, json: async () => ACCOUNTS } as Response;
    }
    return { ok: true, json: async () => [] } as Response;
  });
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useSavingsGoal — compute over config + history", () => {
  it("runs computeSavingsGoal and exposes the derived streak", async () => {
    mockFetch();
    const { result } = renderHook(() => useSavingsGoal());

    await act(async () => {});

    // Feb and Mar both met their target on both tracked accounts → current 2.
    expect(result.current.goal.streak.current).toBe(2);
    expect(result.current.goal.streak.best).toBe(2);
  });

  it("tracks the eligible accounts and excludes Mortgage/CreditCard", async () => {
    mockFetch();
    const { result } = renderHook(() => useSavingsGoal());

    await act(async () => {});

    const ids = result.current.goal.perAccount.map((row) => row.id);
    expect(ids).toEqual(["a1", "a2"]);
    expect(ids).not.toContain("m1");
  });
});

// A stateful mock: GET returns the current stored config, PUT overwrites it and
// echoes it back, and every call is recorded so a test can inspect the request.
function mockStatefulFetch(initial: unknown = CONFIG) {
  const calls: { url: string; method: string; body?: string }[] = [];
  let current = initial;
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = typeof input === "string" ? input : input.toString();
    const method = (init?.method ?? "GET").toUpperCase();
    calls.push({ url, method, body: init?.body as string | undefined });
    if (url.includes("/savings-goal")) {
      if (method === "PUT") current = JSON.parse(init!.body as string);
      return { ok: true, json: async () => current } as Response;
    }
    if (url.includes("/projection/history")) {
      return { ok: true, json: async () => POINTS } as Response;
    }
    if (url.includes("/imports")) {
      return { ok: true, json: async () => IMPORTS } as Response;
    }
    if (url.includes("/accounts")) {
      return { ok: true, json: async () => ACCOUNTS } as Response;
    }
    return { ok: true, json: async () => [] } as Response;
  });
  return { calls };
}

describe("useSavingsGoal — save (write path)", () => {
  it("PUTs the config to /savings-goal", async () => {
    const { calls } = mockStatefulFetch();
    const { result } = renderHook(() => useSavingsGoal());
    await act(async () => {});

    await act(async () => {
      await result.current.save({
        ...CONFIG,
        manualMonthly: { a1: 20000, a2: 20000 },
      });
    });

    const put = calls.find(
      (c) => c.url.includes("/savings-goal") && c.method === "PUT"
    );
    expect(put).toBeTruthy();
    expect(JSON.parse(put!.body as string)).toMatchObject({
      manualMonthly: { a1: 20000, a2: 20000 },
    });
  });

  it("re-derives the goal from the new targets without a reload", async () => {
    mockStatefulFetch();
    const { result } = renderHook(() => useSavingsGoal());
    await act(async () => {});

    // Initial targets (€100/mo) are met every month → current streak 2.
    expect(result.current.goal.streak.current).toBe(2);

    await act(async () => {
      await result.current.save({
        ...CONFIG,
        manualMonthly: { a1: 20000, a2: 20000 },
      });
    });

    // €200/mo targets outrun the €100/mo actual gain → no month qualifies.
    expect(result.current.goal.streak.current).toBe(0);
    expect(
      result.current.goal.perAccount.find((row) => row.id === "a1")?.target
    ).toBe(20000);
  });
});

describe("useSavingsGoal — loading state", () => {
  it("is loading before the fetches resolve", () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      () => new Promise(() => {})
    );

    const { result } = renderHook(() => useSavingsGoal());

    expect(result.current.isLoading).toBe(true);
  });

  it("is no longer loading after the fetches resolve", async () => {
    mockFetch();
    const { result } = renderHook(() => useSavingsGoal());

    await act(async () => {});

    expect(result.current.isLoading).toBe(false);
  });
});
