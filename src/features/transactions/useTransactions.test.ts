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

const updatedTransaction: Transaction = {
  _id: "txn-1",
  accountId: ACCOUNT_ID,
  date: "2026-03-01",
  amount: -7500,
  description: "Groceries (updated)",
  category: "Food",
};

const transferTransactionA: Transaction = {
  _id: "txn-3",
  accountId: ACCOUNT_ID,
  date: "2026-03-05",
  amount: -50000,
  description: "Savings deposit",
  category: "Transfer",
  transferId: "transfer-abc",
};

const transferTransactionB: Transaction = {
  _id: "txn-4",
  accountId: "acc-2",
  date: "2026-03-05",
  amount: 50000,
  description: "Savings deposit",
  category: "Transfer",
  transferId: "transfer-abc",
};

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

describe("useTransactions — update", () => {
  it("calls PATCH /transactions/:id with the payload", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [existingTransaction],
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => updatedTransaction,
      } as Response);

    const { result } = renderHook(() => useTransactions(ACCOUNT_ID));
    await act(async () => {});

    await act(async () => {
      await result.current.update("txn-1", {
        date: "2026-03-01",
        amount: -7500,
        description: "Groceries (updated)",
        category: "Food",
      });
    });

    const patchCall = vi.mocked(fetch).mock.calls.find(
      ([url, init]) =>
        typeof url === "string" &&
        url.includes("/transactions/txn-1") &&
        (init as RequestInit)?.method === "PATCH"
    );
    expect(patchCall).toBeDefined();
  });

  it("replaces the updated transaction in the list after a successful update", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [existingTransaction],
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => updatedTransaction,
      } as Response);

    const { result } = renderHook(() => useTransactions(ACCOUNT_ID));
    await act(async () => {});

    await act(async () => {
      await result.current.update("txn-1", {
        date: "2026-03-01",
        amount: -7500,
        description: "Groceries (updated)",
        category: "Food",
      });
    });

    expect(result.current.transactions).toContainEqual(updatedTransaction);
    expect(result.current.transactions).not.toContainEqual(existingTransaction);
  });

  it("throws when the server returns an error on update", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [existingTransaction],
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Update failed" }),
      } as Response);

    const { result } = renderHook(() => useTransactions(ACCOUNT_ID));
    await act(async () => {});

    expect(result.current.update).toBeDefined();
    await expect(
      act(async () => {
        await result.current.update("txn-1", {
          date: "2026-03-01",
          amount: -7500,
          description: "Groceries (updated)",
          category: "Food",
        });
      })
    ).rejects.toThrow();
  });
});

describe("useTransactions — remove", () => {
  it("calls DELETE /transactions/:id", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [existingTransaction],
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

    const { result } = renderHook(() => useTransactions(ACCOUNT_ID));
    await act(async () => {});

    await act(async () => {
      await result.current.remove("txn-1");
    });

    const deleteCall = vi.mocked(fetch).mock.calls.find(
      ([url, init]) =>
        typeof url === "string" &&
        url.includes("/transactions/txn-1") &&
        (init as RequestInit)?.method === "DELETE"
    );
    expect(deleteCall).toBeDefined();
  });

  it("removes the transaction from the list after a successful delete", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [existingTransaction],
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

    const { result } = renderHook(() => useTransactions(ACCOUNT_ID));
    await act(async () => {});

    await act(async () => {
      await result.current.remove("txn-1");
    });

    expect(result.current.transactions).not.toContainEqual(existingTransaction);
  });

  it("throws when the server returns an error on delete", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [existingTransaction],
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Delete failed" }),
      } as Response);

    const { result } = renderHook(() => useTransactions(ACCOUNT_ID));
    await act(async () => {});

    expect(result.current.remove).toBeDefined();
    await expect(
      act(async () => {
        await result.current.remove("txn-1");
      })
    ).rejects.toThrow();
  });
});

describe("useTransactions — removeTransfer", () => {
  it("calls DELETE /transfers/:transferId", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [transferTransactionA, transferTransactionB],
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

    const { result } = renderHook(() => useTransactions(ACCOUNT_ID));
    await act(async () => {});

    await act(async () => {
      await result.current.removeTransfer("transfer-abc");
    });

    const deleteCall = vi.mocked(fetch).mock.calls.find(
      ([url, init]) =>
        typeof url === "string" &&
        url.includes("/transfers/transfer-abc") &&
        (init as RequestInit)?.method === "DELETE"
    );
    expect(deleteCall).toBeDefined();
  });

  it("removes all legs with the matching transferId from the list", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [transferTransactionA, transferTransactionB],
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

    const { result } = renderHook(() => useTransactions(ACCOUNT_ID));
    await act(async () => {});

    await act(async () => {
      await result.current.removeTransfer("transfer-abc");
    });

    expect(result.current.transactions).toHaveLength(0);
  });

  it("throws when the server returns an error on removeTransfer", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [transferTransactionA],
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Transfer delete failed" }),
      } as Response);

    const { result } = renderHook(() => useTransactions(ACCOUNT_ID));
    await act(async () => {});

    expect(result.current.removeTransfer).toBeDefined();
    await expect(
      act(async () => {
        await result.current.removeTransfer("transfer-abc");
      })
    ).rejects.toThrow();
  });
});
