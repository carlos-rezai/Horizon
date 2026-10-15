// @vitest-environment jsdom
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useRecurringTransactions } from "./useRecurringTransactions";
import type { RecurringTransaction } from "../../../types/recurring";

const ACCOUNT_ID = "acc-1";

const rt1: RecurringTransaction = {
  id: "rt-1",
  accountId: "acc-1",
  amount: -120000,
  description: "Rent",
  category: "Housing",
  frequency: "monthly",
  dayOfMonth: 1,
};

const rt2: RecurringTransaction = {
  id: "rt-2",
  accountId: "acc-2",
  amount: -5000,
  description: "Gym",
  category: "Health",
  frequency: "monthly",
  dayOfMonth: 15,
};

const updatedRt1: RecurringTransaction = {
  ...rt1,
  amount: -130000,
  description: "Rent (updated)",
};

beforeEach(() => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    json: async () => [rt1, rt2],
  } as Response);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useRecurringTransactions — initial fetch", () => {
  it("returns only the recurring transactions matching the accountId", async () => {
    const { result } = renderHook(() => useRecurringTransactions(ACCOUNT_ID));

    await act(async () => {});

    expect(result.current.recurringTransactions).toEqual([rt1]);
    expect(
      result.current.recurringTransactions.every(
        (r) => r.accountId === ACCOUNT_ID
      )
    ).toBe(true);
  });

  it("returns both owned rows and transfers mirrored onto the viewed account", async () => {
    const outgoing: RecurringTransaction = {
      id: "rt-out",
      accountId: ACCOUNT_ID,
      amount: 50000,
      description: "Savings deposit",
      category: "Transfer",
      frequency: "monthly",
      dayOfMonth: 25,
      linkedAccountId: "acc-2",
    };
    const incoming: RecurringTransaction = {
      id: "rt-in",
      accountId: "acc-3",
      amount: 95500,
      description: "Mortgage repayment",
      category: "Transfer",
      frequency: "monthly",
      dayOfMonth: 1,
      linkedAccountId: ACCOUNT_ID,
    };
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => [rt1, rt2, outgoing, incoming],
    } as Response);

    const { result } = renderHook(() => useRecurringTransactions(ACCOUNT_ID));

    await act(async () => {});

    expect(result.current.recurringTransactions).toHaveLength(3);
    expect(result.current.recurringTransactions).toEqual(
      expect.arrayContaining([rt1, outgoing, incoming])
    );
    expect(result.current.recurringTransactions).not.toContainEqual(rt2);
  });

  it("starts in a loading state and resolves after fetch", async () => {
    const { result } = renderHook(() => useRecurringTransactions(ACCOUNT_ID));

    expect(result.current.isLoading).toBe(true);

    await act(async () => {});

    expect(result.current.isLoading).toBe(false);
  });
});

describe("useRecurringTransactions — create", () => {
  it("calls POST /recurring-transactions with the payload", async () => {
    const newRt: RecurringTransaction = {
      id: "rt-3",
      accountId: ACCOUNT_ID,
      amount: -2000,
      description: "Spotify",
      category: "Entertainment",
      frequency: "monthly",
      dayOfMonth: 10,
    };

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [rt1, rt2],
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => newRt,
      } as Response);

    const { result } = renderHook(() => useRecurringTransactions(ACCOUNT_ID));
    await act(async () => {});

    await act(async () => {
      await result.current.create({
        amount: -2000,
        description: "Spotify",
        category: "Entertainment",
        frequency: "monthly",
        dayOfMonth: 10,
      });
    });

    const postCall = vi
      .mocked(fetch)
      .mock.calls.find(
        ([url, init]) =>
          typeof url === "string" &&
          url.includes("/recurring-transactions") &&
          (init as RequestInit)?.method === "POST"
      );
    expect(postCall).toBeDefined();
  });

  it("appends the new entry to the list after a successful create", async () => {
    const newRt: RecurringTransaction = {
      id: "rt-3",
      accountId: ACCOUNT_ID,
      amount: -2000,
      description: "Spotify",
      category: "Entertainment",
      frequency: "monthly",
      dayOfMonth: 10,
    };

    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [rt1, rt2],
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => newRt,
      } as Response);

    const { result } = renderHook(() => useRecurringTransactions(ACCOUNT_ID));
    await act(async () => {});

    await act(async () => {
      await result.current.create({
        amount: -2000,
        description: "Spotify",
        category: "Entertainment",
        frequency: "monthly",
        dayOfMonth: 10,
      });
    });

    expect(result.current.recurringTransactions).toContainEqual(newRt);
  });

  it("throws when the server returns an error on create", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [rt1, rt2],
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Validation failed" }),
      } as Response);

    const { result } = renderHook(() => useRecurringTransactions(ACCOUNT_ID));
    await act(async () => {});

    await expect(
      act(async () => {
        await result.current.create({
          amount: 0,
          description: "",
          category: "",
          frequency: "monthly",
          dayOfMonth: 1,
        });
      })
    ).rejects.toThrow();
  });
});

describe("useRecurringTransactions — update", () => {
  it("calls PATCH /recurring-transactions/:id with the updated payload", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [rt1, rt2],
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => updatedRt1,
      } as Response);

    const { result } = renderHook(() => useRecurringTransactions(ACCOUNT_ID));
    await act(async () => {});

    await act(async () => {
      await result.current.update("rt-1", {
        amount: -130000,
        description: "Rent (updated)",
        category: "Housing",
        frequency: "monthly",
        dayOfMonth: 1,
      });
    });

    const patchCall = vi
      .mocked(fetch)
      .mock.calls.find(
        ([url, init]) =>
          typeof url === "string" &&
          url.includes("/recurring-transactions/rt-1") &&
          (init as RequestInit)?.method === "PATCH"
      );
    expect(patchCall).toBeDefined();
  });

  it("replaces the updated entry in the list", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [rt1, rt2],
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => updatedRt1,
      } as Response);

    const { result } = renderHook(() => useRecurringTransactions(ACCOUNT_ID));
    await act(async () => {});

    await act(async () => {
      await result.current.update("rt-1", {
        amount: -130000,
        description: "Rent (updated)",
        category: "Housing",
        frequency: "monthly",
        dayOfMonth: 1,
      });
    });

    expect(result.current.recurringTransactions).toContainEqual(updatedRt1);
    expect(result.current.recurringTransactions).not.toContainEqual(rt1);
  });
});

describe("useRecurringTransactions — remove", () => {
  it("calls DELETE /recurring-transactions/:id", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [rt1, rt2],
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

    const { result } = renderHook(() => useRecurringTransactions(ACCOUNT_ID));
    await act(async () => {});

    await act(async () => {
      await result.current.remove("rt-1");
    });

    const deleteCall = vi
      .mocked(fetch)
      .mock.calls.find(
        ([url, init]) =>
          typeof url === "string" &&
          url.includes("/recurring-transactions/rt-1") &&
          (init as RequestInit)?.method === "DELETE"
      );
    expect(deleteCall).toBeDefined();
  });

  it("removes the entry from the list after a successful delete", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [rt1, rt2],
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({}),
      } as Response);

    const { result } = renderHook(() => useRecurringTransactions(ACCOUNT_ID));
    await act(async () => {});

    await act(async () => {
      await result.current.remove("rt-1");
    });

    expect(result.current.recurringTransactions).not.toContainEqual(rt1);
  });

  it("throws when the server returns an error on remove", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [rt1, rt2],
      } as Response)
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ error: "Delete failed" }),
      } as Response);

    const { result } = renderHook(() => useRecurringTransactions(ACCOUNT_ID));
    await act(async () => {});

    await expect(
      act(async () => {
        await result.current.remove("rt-1");
      })
    ).rejects.toThrow();
  });
});
