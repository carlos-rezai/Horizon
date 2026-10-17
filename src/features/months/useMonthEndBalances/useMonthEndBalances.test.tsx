// @vitest-environment jsdom
import { renderHook, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import CacheProvider from "../../../components/CacheProvider/CacheProvider";
import { useMonthEndBalances } from "./useMonthEndBalances";

// Today is 16 October 2026. The projection runs from October; History is
// reconstructed through October, with Main known from August.
const SNAPSHOTS = [
  { month: "2026-10", accounts: { main: { projected: 500000 } } },
  { month: "2026-11", accounts: { main: { projected: 650000 } } },
];
const POINTS = [
  {
    month: "2026-07",
    totalLiquid: null,
    restschuld: null,
    netCashflow: 0,
    accounts: { main: null },
  },
  {
    month: "2026-08",
    totalLiquid: 420000,
    restschuld: null,
    netCashflow: 0,
    accounts: { main: 420000 },
  },
];
const ACCOUNTS = [{ id: "main" }];

function respond(body: unknown, ok = true): Response {
  return { ok, status: ok ? 200 : 500, json: async () => body } as Response;
}

function mockFetch({
  projectionFails = false,
  historyFails = false,
  hold = false,
} = {}) {
  vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
    if (hold) return new Promise<Response>(() => {});
    const url = String(input);
    if (url.includes("/projection/history")) {
      return Promise.resolve(respond(POINTS, !historyFails));
    }
    if (url.includes("/projection")) {
      return Promise.resolve(respond(SNAPSHOTS, !projectionFails));
    }
    return Promise.resolve(respond([]));
  });
}

function urls(): string[] {
  return vi.mocked(fetch).mock.calls.map(([url]) => String(url));
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 16, 12, 0));
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function render(month: string) {
  return renderHook(() => useMonthEndBalances(month, ACCOUNTS), {
    wrapper: CacheProvider,
  });
}

describe("useMonthEndBalances — reads", () => {
  it("reads the cached projection and History", async () => {
    mockFetch();
    const { result } = render("2026-10");

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(urls().some((u) => u.includes("/projection/history"))).toBe(true);
    expect(urls().some((u) => /\/projection\?/.test(u))).toBe(true);
  });
});

describe("useMonthEndBalances — balances", () => {
  beforeEach(() => mockFetch());

  it("answers Projected for the current month", async () => {
    const { result } = render("2026-10");
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.balances).toEqual({
      main: { basis: "projected", cents: 500000 },
    });
  });

  it("answers Actual for a past month", async () => {
    const { result } = render("2026-08");
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.balances).toEqual({
      main: { basis: "actual", cents: 420000 },
    });
  });

  it("answers Unknown before the account is known, naming when it is", async () => {
    const { result } = render("2026-07");
    await waitFor(() => expect(result.current.isLoading).toBe(false));
    expect(result.current.balances).toEqual({
      main: { basis: "unknown", knownFrom: "2026-08" },
    });
  });
});

describe("useMonthEndBalances — loading and errors", () => {
  it("is loading while either read is in flight", () => {
    mockFetch({ hold: true });
    const { result } = render("2026-10");
    expect(result.current.isLoading).toBe(true);
    expect(result.current.error).toBeNull();
  });

  it("reports the projection's error", async () => {
    mockFetch({ projectionFails: true });
    const { result } = render("2026-10");
    await waitFor(() => expect(result.current.error).not.toBeNull());
  });

  it("reports History's error", async () => {
    mockFetch({ historyFails: true });
    const { result } = render("2026-08");
    await waitFor(() => expect(result.current.error).not.toBeNull());
  });
});
