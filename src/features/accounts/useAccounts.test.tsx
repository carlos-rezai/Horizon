// @vitest-environment jsdom
import type { ReactNode } from "react";
import {
  renderHook,
  render,
  screen,
  act,
  cleanup,
  waitFor,
} from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import CacheProvider from "../../components/CacheProvider/CacheProvider";
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

/** Renders the accounts balance as text so a test can read what was painted. */
function Consumer() {
  const { accounts, isLoading, error } = useAccounts();
  return (
    <div data-testid="accounts">
      {isLoading
        ? "loading"
        : error
          ? `error:${error}`
          : String(accounts[0]?.balance ?? "empty")}
    </div>
  );
}

function Harness({ visible }: { visible: boolean }) {
  return <CacheProvider>{visible ? <Consumer /> : null}</CacheProvider>;
}

function wrapper({ children }: { children: ReactNode }) {
  return <CacheProvider>{children}</CacheProvider>;
}

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
  cleanup();
  vi.restoreAllMocks();
});

describe("useAccounts", () => {
  it("exposes accounts, isLoading, error and refresh", async () => {
    const { result } = renderHook(() => useAccounts(), { wrapper });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.accounts).toEqual([]);

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.accounts).toEqual([account1]);
    expect(result.current.error).toBeNull();
    expect(typeof result.current.refresh).toBe("function");
  });

  it("re-fetches accounts when refresh() is called", async () => {
    const { result } = renderHook(() => useAccounts(), { wrapper });

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

  it("paints instantly from cache when a view is revisited", async () => {
    const { rerender } = render(<Harness visible />);

    await waitFor(() => {
      expect(screen.getByTestId("accounts")).toHaveTextContent("100000");
    });

    rerender(<Harness visible={false} />);
    rerender(<Harness visible />);

    // No loading flash on revisit — the cached balance is on the first frame.
    expect(screen.getByTestId("accounts")).toHaveTextContent("100000");

    // …and the background revalidation reconciles to the fresh value.
    await waitFor(() => {
      expect(screen.getByTestId("accounts")).toHaveTextContent("250000");
    });
  });

  it("surfaces a failed fetch as an error state", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 500,
    } as Response);

    const { result } = renderHook(() => useAccounts(), { wrapper });

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false);
    });
    expect(result.current.error).toMatch(/500/);
    expect(result.current.accounts).toEqual([]);
  });
});
