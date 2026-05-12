// @vitest-environment jsdom
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useAllRecurringTransactions } from "./useAllRecurringTransactions";
import type { RecurringTransaction } from "../../types/recurring";

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
  amount: 500000,
  description: "Sondertilgung",
  category: "Mortgage",
  frequency: "annual",
  dayOfMonth: 1,
  linkedAccountId: "mortgage-1",
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

describe("useAllRecurringTransactions", () => {
  it("returns all recurring transactions without filtering by accountId", async () => {
    const { result } = renderHook(() => useAllRecurringTransactions());

    await act(async () => {});

    expect(result.current.recurringTransactions).toHaveLength(2);
    expect(result.current.recurringTransactions).toContainEqual(rt1);
    expect(result.current.recurringTransactions).toContainEqual(rt2);
  });

  it("starts in a loading state and resolves after fetch", async () => {
    const { result } = renderHook(() => useAllRecurringTransactions());

    expect(result.current.isLoading).toBe(true);

    await act(async () => {});

    expect(result.current.isLoading).toBe(false);
  });
});
