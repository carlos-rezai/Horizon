// @vitest-environment jsdom
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useTransactions } from "./useTransactions";
import type { Transaction } from "../../types/transaction";

const ACCOUNT_ID = "acc-1";

const existingTransaction: Transaction = {
  _id: "txn-1",
  accountId: ACCOUNT_ID,
  date: "2026-03-01",
  amount: -5000,
  description: "Groceries",
  category: "Food",
};

const newTransaction: Transaction = {
  _id: "txn-2",
  accountId: ACCOUNT_ID,
  date: "2026-03-15",
  amount: 200000,
  description: "Salary",
  category: "Income",
};

beforeEach(() => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    json: async () => [existingTransaction],
  } as Response);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useTransactions — initial fetch", () => {
  it("returns the transactions for the account after loading", async () => {
    const { result } = renderHook(() => useTransactions(ACCOUNT_ID));

    expect(result.current.isLoading).toBe(true);

    await act(async () => {});

    expect(result.current.transactions).toEqual([existingTransaction]);
    expect(result.current.isLoading).toBe(false);
  });
});

describe("useTransactions — create", () => {
  it("calls POST /accounts/:id/transactions with the payload", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [existingTransaction],
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => newTransaction,
      } as Response);

    const { result } = renderHook(() => useTransactions(ACCOUNT_ID));
    await act(async () => {});

    await act(async () => {
      await result.current.create({
        date: "2026-03-15",
        amount: 200000,
        description: "Salary",
        category: "Income",
      });
    });

    const calls = vi.mocked(fetch).mock.calls;
    const createCall = calls.find(
      ([url, init]) =>
        typeof url === "string" &&
        url.includes(`/accounts/${ACCOUNT_ID}/transactions`) &&
        (init as RequestInit)?.method === "POST"
    );

    expect(createCall).toBeDefined();
  });

  it("appends the new transaction to the list after a successful create", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [existingTransaction],
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => newTransaction,
      } as Response);

    const { result } = renderHook(() => useTransactions(ACCOUNT_ID));
    await act(async () => {});

    await act(async () => {
      await result.current.create({
        date: "2026-03-15",
        amount: 200000,
        description: "Salary",
        category: "Income",
      });
    });

    expect(result.current.transactions).toContainEqual(newTransaction);
  });

  it("throws when the server returns an error", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [existingTransaction],
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Validation failed" }),
      } as Response);

    const { result } = renderHook(() => useTransactions(ACCOUNT_ID));
    await act(async () => {});

    await expect(
      act(async () => {
        await result.current.create({
          date: "",
          amount: 0,
          description: "",
          category: "",
        });
      })
    ).rejects.toThrow();
  });
});
