// @vitest-environment jsdom
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useMonthTransactions } from "./useMonthTransactions";
import type { Transaction } from "../../types/transaction";

const ACCOUNT_ID = "acc-1";
const MONTH = "2026-05";

const mayTransaction: Transaction = {
  id: "txn-1",
  accountId: ACCOUNT_ID,
  date: "2026-05-10",
  amount: -5000,
  description: "Groceries",
  category: "Food",
};

const newTransaction: Transaction = {
  id: "txn-2",
  accountId: ACCOUNT_ID,
  date: "2026-05-15",
  amount: -8000,
  description: "Restaurant",
  category: "Food",
};

const updatedTransaction: Transaction = {
  id: "txn-1",
  accountId: ACCOUNT_ID,
  date: "2026-05-10",
  amount: -6000,
  description: "Groceries (updated)",
  category: "Food",
};

beforeEach(() => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    json: async () => [mayTransaction],
  } as Response);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useMonthTransactions — initial fetch", () => {
  it("fetches GET /accounts/:id/transactions?month=YYYY-MM on mount", async () => {
    renderHook(() => useMonthTransactions(ACCOUNT_ID, MONTH));

    await act(async () => {});

    const getCall = vi
      .mocked(fetch)
      .mock.calls.find(
        ([url]) =>
          typeof url === "string" &&
          url.includes(`/accounts/${ACCOUNT_ID}/transactions`) &&
          url.includes("month=2026-05")
      );
    expect(getCall).toBeDefined();
  });

  it("returns the filtered transactions after loading", async () => {
    const { result } = renderHook(() =>
      useMonthTransactions(ACCOUNT_ID, MONTH)
    );

    expect(result.current.isLoading).toBe(true);

    await act(async () => {});

    expect(result.current.transactions).toEqual([mayTransaction]);
    expect(result.current.isLoading).toBe(false);
  });
});

describe("useMonthTransactions — create", () => {
  it("calls POST /accounts/:id/transactions and appends the new transaction", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [mayTransaction],
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => newTransaction,
      } as Response);

    const { result } = renderHook(() =>
      useMonthTransactions(ACCOUNT_ID, MONTH)
    );
    await act(async () => {});

    await act(async () => {
      await result.current.create({
        date: "2026-05-15",
        amount: -8000,
        description: "Restaurant",
        category: "Food",
      });
    });

    const createCall = vi
      .mocked(fetch)
      .mock.calls.find(
        ([url, init]) =>
          typeof url === "string" &&
          url.includes(`/accounts/${ACCOUNT_ID}/transactions`) &&
          (init as RequestInit)?.method === "POST"
      );
    expect(createCall).toBeDefined();
    expect(result.current.transactions).toContainEqual(newTransaction);
  });
});

describe("useMonthTransactions — update", () => {
  it("calls PATCH /transactions/:id and replaces the transaction in the list", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [mayTransaction],
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => updatedTransaction,
      } as Response);

    const { result } = renderHook(() =>
      useMonthTransactions(ACCOUNT_ID, MONTH)
    );
    await act(async () => {});

    await act(async () => {
      await result.current.update("txn-1", {
        date: "2026-05-10",
        amount: -6000,
        description: "Groceries (updated)",
        category: "Food",
      });
    });

    const patchCall = vi
      .mocked(fetch)
      .mock.calls.find(
        ([url, init]) =>
          typeof url === "string" &&
          url.includes("/transactions/txn-1") &&
          (init as RequestInit)?.method === "PATCH"
      );
    expect(patchCall).toBeDefined();
    expect(result.current.transactions).toContainEqual(updatedTransaction);
    expect(result.current.transactions).not.toContainEqual(mayTransaction);
  });
});

describe("useMonthTransactions — remove", () => {
  it("calls DELETE /transactions/:id and removes it from the list", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [mayTransaction],
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

    const { result } = renderHook(() =>
      useMonthTransactions(ACCOUNT_ID, MONTH)
    );
    await act(async () => {});

    await act(async () => {
      await result.current.remove("txn-1");
    });

    const deleteCall = vi
      .mocked(fetch)
      .mock.calls.find(
        ([url, init]) =>
          typeof url === "string" &&
          url.includes("/transactions/txn-1") &&
          (init as RequestInit)?.method === "DELETE"
      );
    expect(deleteCall).toBeDefined();
    expect(result.current.transactions).not.toContainEqual(mayTransaction);
  });
});
