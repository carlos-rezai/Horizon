// @vitest-environment jsdom
import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { useAccounts } from "./useAccounts";
import type { AccountWithBalance } from "../../types/account";

const account1: AccountWithBalance = {
  id: "a1",
  kind: "Girokonto",
  name: "Main",
  openingBalance: 100000,
  openingDate: "2026-01-01",
  balance: 100000,
};

const account1Updated: AccountWithBalance = {
  ...account1,
  openingBalance: 250000,
  balance: 250000,
};

beforeEach(() => {
  let callCount = 0;
  vi.spyOn(globalThis, "fetch").mockImplementation(() => {
    callCount += 1;
    return Promise.resolve({
      ok: true,
      json: async () => (callCount === 1 ? [account1] : [account1Updated]),
    } as Response);
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useAccounts", () => {
  it("re-fetches accounts when refresh() is called", async () => {
    const { result } = renderHook(() => useAccounts());

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.accounts[0].balance).toBe(100000);

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.accounts[0].balance).toBe(250000);
    });

    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });
});
