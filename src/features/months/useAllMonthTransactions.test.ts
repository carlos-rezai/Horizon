// @vitest-environment jsdom
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useAllMonthTransactions } from "./useAllMonthTransactions";
import type { Transaction } from "../../types/transaction";

const MONTH = "2026-05";
const ACCOUNT_IDS = ["acc-1", "acc-2"];

const acc1Transaction: Transaction = {
  id: "txn-1",
  accountId: "acc-1",
  date: "2026-05-10",
  amount: -5000,
  description: "Supermarket",
  category: "Food",
};

const acc2Transaction: Transaction = {
  id: "txn-2",
  accountId: "acc-2",
  date: "2026-05-12",
  amount: -3000,
  description: "Dental",
  category: "Health",
};

beforeEach(() => {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url.includes("acc-1")) {
      return {
        ok: true,
        json: async () => [acc1Transaction],
      } as Response;
    }
    return {
      ok: true,
      json: async () => [acc2Transaction],
    } as Response;
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useAllMonthTransactions — fetch", () => {
  it("fetches GET /accounts/:id/transactions?month=YYYY-MM for each account ID", async () => {
    renderHook(() => useAllMonthTransactions(ACCOUNT_IDS, MONTH));

    await act(async () => {});

    const calls = vi
      .mocked(fetch)
      .mock.calls.map(([url]) =>
        typeof url === "string" ? url : url.toString()
      );

    expect(
      calls.some(
        (url) => url.includes("acc-1") && url.includes(`month=${MONTH}`)
      )
    ).toBe(true);
    expect(
      calls.some(
        (url) => url.includes("acc-2") && url.includes(`month=${MONTH}`)
      )
    ).toBe(true);
  });

  it("returns aggregated transactions from all accounts", async () => {
    const { result } = renderHook(() =>
      useAllMonthTransactions(ACCOUNT_IDS, MONTH)
    );

    await act(async () => {});

    expect(result.current.transactions).toContainEqual(acc1Transaction);
    expect(result.current.transactions).toContainEqual(acc2Transaction);
  });
});

describe("useAllMonthTransactions — loading state", () => {
  it("isLoading is true before the fetches resolve", () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      () => new Promise(() => {})
    );

    const { result } = renderHook(() =>
      useAllMonthTransactions(ACCOUNT_IDS, MONTH)
    );

    expect(result.current.isLoading).toBe(true);
  });

  it("isLoading is false after all fetches resolve", async () => {
    const { result } = renderHook(() =>
      useAllMonthTransactions(ACCOUNT_IDS, MONTH)
    );

    await act(async () => {});

    expect(result.current.isLoading).toBe(false);
  });
});

describe("useAllMonthTransactions — empty accounts", () => {
  it("returns empty transactions and isLoading false when no account IDs are given", async () => {
    const { result } = renderHook(() => useAllMonthTransactions([], MONTH));

    await act(async () => {});

    expect(result.current.transactions).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });
});

describe("useAllMonthTransactions — refetch", () => {
  it("re-fetches all accounts when refetch is called", async () => {
    const { result } = renderHook(() =>
      useAllMonthTransactions(ACCOUNT_IDS, MONTH)
    );

    await act(async () => {});

    const callsBefore = vi.mocked(fetch).mock.calls.length;

    await act(async () => {
      result.current.refetch();
    });

    expect(vi.mocked(fetch).mock.calls.length).toBeGreaterThan(callsBefore);
  });
});
