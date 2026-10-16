// @vitest-environment jsdom
import type { ReactNode } from "react";
import { renderHook, act, cleanup, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import CacheProvider from "../../../components/CacheProvider/CacheProvider";
import { useHistoryPoints } from "./useHistoryPoints";
import type { HistoryPoint } from "../../../types/history";

const point = (month: string, totalLiquid: number): HistoryPoint => ({
  month,
  totalLiquid,
  restschuld: null,
  netCashflow: 0,
  accounts: { g1: totalLiquid },
});

const first = [point("2026-09", 100000)];
const second = [point("2026-09", 250000)];

function wrapper({ children }: { children: ReactNode }) {
  return <CacheProvider>{children}</CacheProvider>;
}

beforeEach(() => {
  let callCount = 0;
  vi.spyOn(globalThis, "fetch").mockImplementation(() => {
    callCount += 1;
    return Promise.resolve({
      ok: true,
      json: async () => (callCount === 1 ? first : second),
    } as Response);
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("useHistoryPoints", () => {
  it("exposes points, isLoading, error and refresh", async () => {
    const { result } = renderHook(() => useHistoryPoints(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.points).toEqual([]);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.points).toEqual(first);
    expect(result.current.error).toBeNull();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/projection\/history$/)
    );
  });

  it("keeps a stable empty array before the points load", () => {
    const { result, rerender } = renderHook(() => useHistoryPoints(), {
      wrapper,
    });
    const before = result.current.points;

    rerender();

    expect(result.current.points).toBe(before);
  });

  it("shares one request between two readers", async () => {
    const { result } = renderHook(
      () => ({ a: useHistoryPoints(), b: useHistoryPoints() }),
      { wrapper }
    );

    await waitFor(() => {
      expect(result.current.a.isLoading).toBe(false);
    });
    expect(result.current.b.points).toEqual(first);
    expect(globalThis.fetch).toHaveBeenCalledTimes(1);
  });

  it("re-fetches the points when refresh() is called", async () => {
    const { result } = renderHook(() => useHistoryPoints(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.points).toEqual(second);
    });
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it("surfaces a failed fetch as an error state", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);

    const { result } = renderHook(() => useHistoryPoints(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.error).toMatch(/500/);
    expect(result.current.points).toEqual([]);
  });
});
