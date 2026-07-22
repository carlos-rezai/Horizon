// @vitest-environment jsdom
import { type ReactNode } from "react";
import {
  render,
  screen,
  cleanup,
  renderHook,
  waitFor,
  act,
} from "@testing-library/react";
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../tokens";
import CacheProvider from "../../components/CacheProvider/CacheProvider";
import SnackbarProvider from "../../components/SnackbarProvider/SnackbarProvider";
import { useAccounts } from "../accounts/useAccounts";
import { useProjection } from "../projection/useProjection";
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

/** Paints the aggregated transaction descriptions as text. */
function Consumer({
  accountIds,
  month,
  testId = "consumer",
}: {
  accountIds: string[];
  month: string;
  testId?: string;
}) {
  const { transactions, isLoading } = useAllMonthTransactions(
    accountIds,
    month
  );
  return (
    <div data-testid={testId}>
      {isLoading
        ? "loading"
        : transactions.map((tx) => tx.description).join(",") || "empty"}
    </div>
  );
}

/** Mounts/unmounts a consumer inside a provider that itself stays mounted. */
function Harness({
  visible,
  children,
}: {
  visible: boolean;
  children: ReactNode;
}) {
  return <CacheProvider>{visible ? children : null}</CacheProvider>;
}

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
  cleanup();
  vi.restoreAllMocks();
});

describe("useAllMonthTransactions — fetch", () => {
  it("fetches GET /accounts/:id/transactions?month=YYYY-MM for each account ID", async () => {
    renderHook(() => useAllMonthTransactions(ACCOUNT_IDS, MONTH), {
      wrapper: CacheProvider,
    });

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
    const { result } = renderHook(
      () => useAllMonthTransactions(ACCOUNT_IDS, MONTH),
      { wrapper: CacheProvider }
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

    const { result } = renderHook(
      () => useAllMonthTransactions(ACCOUNT_IDS, MONTH),
      { wrapper: CacheProvider }
    );

    expect(result.current.isLoading).toBe(true);
  });

  it("isLoading is false after all fetches resolve", async () => {
    const { result } = renderHook(
      () => useAllMonthTransactions(ACCOUNT_IDS, MONTH),
      { wrapper: CacheProvider }
    );

    await act(async () => {});

    expect(result.current.isLoading).toBe(false);
  });
});

describe("useAllMonthTransactions — empty accounts", () => {
  it("returns empty transactions and isLoading false when no account IDs are given", async () => {
    const { result } = renderHook(() => useAllMonthTransactions([], MONTH), {
      wrapper: CacheProvider,
    });

    await act(async () => {});

    expect(result.current.transactions).toEqual([]);
    expect(result.current.isLoading).toBe(false);
  });
});

describe("useAllMonthTransactions — refetch", () => {
  it("re-fetches all accounts when refetch is called", async () => {
    const { result } = renderHook(
      () => useAllMonthTransactions(ACCOUNT_IDS, MONTH),
      { wrapper: CacheProvider }
    );

    await act(async () => {});

    const callsBefore = vi.mocked(fetch).mock.calls.length;

    await act(async () => {
      result.current.refetch();
    });

    expect(vi.mocked(fetch).mock.calls.length).toBeGreaterThan(callsBefore);
  });
});

describe("useAllMonthTransactions — cached per accounts and month", () => {
  it("serves two concurrent readers of the same accounts and month from one set of requests", async () => {
    const { result } = renderHook(
      () => ({
        a: useAllMonthTransactions(ACCOUNT_IDS, MONTH),
        b: useAllMonthTransactions(ACCOUNT_IDS, MONTH),
      }),
      { wrapper: CacheProvider }
    );

    await waitFor(() => {
      expect(result.current.a.transactions).toHaveLength(2);
    });
    expect(result.current.b.transactions).toHaveLength(2);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(ACCOUNT_IDS.length);
  });

  it("treats a different month as a separate entry", async () => {
    renderHook(
      () => ({
        may: useAllMonthTransactions(ACCOUNT_IDS, "2026-05"),
        june: useAllMonthTransactions(ACCOUNT_IDS, "2026-06"),
      }),
      { wrapper: CacheProvider }
    );

    await act(async () => {});

    const calls = vi.mocked(fetch).mock.calls.map(([url]) => String(url));
    expect(calls.filter((url) => url.includes("month=2026-05"))).toHaveLength(
      ACCOUNT_IDS.length
    );
    expect(calls.filter((url) => url.includes("month=2026-06"))).toHaveLength(
      ACCOUNT_IDS.length
    );
  });

  it("paints a previously read month on the first frame after a remount", async () => {
    const consumer = <Consumer accountIds={ACCOUNT_IDS} month={MONTH} />;

    const { rerender } = render(<Harness visible>{consumer}</Harness>);
    await waitFor(() => {
      expect(screen.getByTestId("consumer")).toHaveTextContent(
        "Supermarket,Dental"
      );
    });

    rerender(<Harness visible={false}>{consumer}</Harness>);
    rerender(<Harness visible>{consumer}</Harness>);

    expect(screen.getByTestId("consumer")).toHaveTextContent(
      "Supermarket,Dental"
    );
  });
});

/**
 * A promise plus the handle to settle it, so a test can hold the server
 * mid-flight and inspect the frame the user actually sees while waiting.
 */
function deferred<T>(): {
  promise: Promise<T>;
  resolve: (value: T) => void;
} {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => {
    resolve = res;
  });
  return { promise, resolve };
}

function ok(body: unknown): Response {
  return { ok: true, json: async () => body } as Response;
}

function rejected(message: string): Response {
  return { ok: false, json: async () => ({ error: message }) } as Response;
}

/** The chrome a mutation needs: a cache to write to, snackbars to fail into. */
function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <CacheProvider>
        <SnackbarProvider>{children}</SnackbarProvider>
      </CacheProvider>
    </ThemeProvider>
  );
}

const describes = (list: Transaction[]) => list.map((tx) => tx.description);
const idsOf = (list: Transaction[]) => list.map((tx) => tx.id);

/** The row the server stores for the optimistic "Coffee" create below. */
const savedCoffee: Transaction = {
  id: "txn-9",
  accountId: "acc-1",
  date: "2026-05-20",
  amount: -350,
  description: "Coffee",
  category: "Food",
};

const COFFEE = {
  date: "2026-05-20",
  amount: -350,
  description: "Coffee",
  category: "Food",
};

const RENAMED = {
  date: "2026-05-10",
  amount: -5000,
  description: "Supermarket (corrected)",
  category: "Food",
};

/** Serves each account's list on GET and every mutation the given response. */
function mockFetchWithMutation(response: Promise<Response> | Response): void {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const url = String(input);
    const method = (init as RequestInit | undefined)?.method ?? "GET";
    if (method !== "GET") return response;
    return ok(url.includes("acc-1") ? [acc1Transaction] : [acc2Transaction]);
  });
}

describe("useAllMonthTransactions — optimistic create", () => {
  it("shows the new transaction before the server responds", async () => {
    const post = deferred<Response>();
    mockFetchWithMutation(post.promise);

    const { result } = renderHook(
      () => useAllMonthTransactions(ACCOUNT_IDS, MONTH),
      { wrapper: Providers }
    );
    await act(async () => {});

    let pending!: Promise<void>;
    act(() => {
      pending = result.current.create("acc-1", COFFEE);
    });

    expect(describes(result.current.transactions)).toContain("Coffee");

    await act(async () => {
      post.resolve(ok(savedCoffee));
      await pending;
    });
  });

  it("posts the new transaction to the account it was recorded on", async () => {
    mockFetchWithMutation(ok(savedCoffee));

    const { result } = renderHook(
      () => useAllMonthTransactions(ACCOUNT_IDS, MONTH),
      { wrapper: Providers }
    );
    await act(async () => {});

    await act(async () => {
      await result.current.create("acc-1", COFFEE);
    });

    const postCall = vi
      .mocked(fetch)
      .mock.calls.find(
        ([url, init]) =>
          String(url).includes("/accounts/acc-1/transactions") &&
          (init as RequestInit | undefined)?.method === "POST"
      );
    expect(postCall).toBeDefined();
  });

  it("swaps the provisional id for the server id once the create lands", async () => {
    const post = deferred<Response>();
    mockFetchWithMutation(post.promise);

    const { result } = renderHook(
      () => useAllMonthTransactions(ACCOUNT_IDS, MONTH),
      { wrapper: Providers }
    );
    await act(async () => {});

    let pending!: Promise<void>;
    act(() => {
      pending = result.current.create("acc-1", COFFEE);
    });

    // Painted, but not yet carrying the id the server will assign.
    const provisionalIds = idsOf(result.current.transactions);
    expect(provisionalIds).toHaveLength(3);
    expect(provisionalIds).not.toContain("txn-9");

    await act(async () => {
      post.resolve(ok(savedCoffee));
      await pending;
    });

    expect(idsOf(result.current.transactions)).toEqual([
      "txn-1",
      "txn-2",
      "txn-9",
    ]);
  });
});

describe("useAllMonthTransactions — optimistic update and remove", () => {
  it("applies an edit in place before the server responds", async () => {
    const patch = deferred<Response>();
    mockFetchWithMutation(patch.promise);

    const { result } = renderHook(
      () => useAllMonthTransactions(ACCOUNT_IDS, MONTH),
      { wrapper: Providers }
    );
    await act(async () => {});

    let pending!: Promise<void>;
    act(() => {
      pending = result.current.update("txn-1", RENAMED);
    });

    expect(describes(result.current.transactions)).toEqual([
      "Supermarket (corrected)",
      "Dental",
    ]);

    await act(async () => {
      patch.resolve(ok({ ...acc1Transaction, ...RENAMED }));
      await pending;
    });
  });

  it("removes a transaction before the server responds", async () => {
    const del = deferred<Response>();
    mockFetchWithMutation(del.promise);

    const { result } = renderHook(
      () => useAllMonthTransactions(ACCOUNT_IDS, MONTH),
      { wrapper: Providers }
    );
    await act(async () => {});

    let pending!: Promise<void>;
    act(() => {
      pending = result.current.remove("txn-1");
    });

    expect(describes(result.current.transactions)).toEqual(["Dental"]);

    await act(async () => {
      del.resolve(ok({}));
      await pending;
    });
  });
});

describe("useAllMonthTransactions — rollback on a rejected mutation", () => {
  it("restores the exact previous list and notifies when a create is rejected", async () => {
    mockFetchWithMutation(rejected("Nope"));

    const { result } = renderHook(
      () => useAllMonthTransactions(ACCOUNT_IDS, MONTH),
      { wrapper: Providers }
    );
    await act(async () => {});

    await act(async () => {
      await result.current.create("acc-1", COFFEE);
    });

    expect(result.current.transactions).toEqual([
      acc1Transaction,
      acc2Transaction,
    ]);
    expect(screen.getByRole("status")).toHaveAttribute("data-variant", "error");
  });

  it("restores the exact previous list and notifies when an edit is rejected", async () => {
    mockFetchWithMutation(rejected("Nope"));

    const { result } = renderHook(
      () => useAllMonthTransactions(ACCOUNT_IDS, MONTH),
      { wrapper: Providers }
    );
    await act(async () => {});

    await act(async () => {
      await result.current.update("txn-1", RENAMED);
    });

    expect(result.current.transactions).toEqual([
      acc1Transaction,
      acc2Transaction,
    ]);
    expect(screen.getByRole("status")).toHaveAttribute("data-variant", "error");
  });

  it("restores the exact previous list and notifies when a delete is rejected", async () => {
    mockFetchWithMutation(rejected("Nope"));

    const { result } = renderHook(
      () => useAllMonthTransactions(ACCOUNT_IDS, MONTH),
      { wrapper: Providers }
    );
    await act(async () => {});

    await act(async () => {
      await result.current.remove("txn-1");
    });

    expect(result.current.transactions).toEqual([
      acc1Transaction,
      acc2Transaction,
    ]);
    expect(screen.getByRole("status")).toHaveAttribute("data-variant", "error");
  });
});

describe("useAllMonthTransactions — transfers", () => {
  it("routes a create with a destination account to the transfer endpoint", async () => {
    mockFetchWithMutation(ok({ id: "tr-1" }));

    const { result } = renderHook(
      () => useAllMonthTransactions(ACCOUNT_IDS, MONTH),
      { wrapper: Providers }
    );
    await act(async () => {});

    await act(async () => {
      await result.current.create("acc-1", { ...COFFEE, toAccountId: "acc-2" });
    });

    const transferCall = vi
      .mocked(fetch)
      .mock.calls.find(
        ([url, init]) =>
          String(url).includes("/transfers") &&
          (init as RequestInit | undefined)?.method === "POST"
      );
    expect(transferCall).toBeDefined();
  });
});

/**
 * Reads the two resources a transaction mutation is supposed to bump, so a
 * test can watch them refetch without knowing how the bump is delivered.
 */
function useBumpProbes(): void {
  useAccounts();
  useProjection();
}

function countRequests(predicate: (url: string) => boolean): number {
  return vi
    .mocked(fetch)
    .mock.calls.map(([url]) => String(url))
    .filter(predicate).length;
}

const isAccountsList = (url: string) => url.endsWith("/accounts");
const isProjection = (url: string) => url.includes("/projection");

describe("useAllMonthTransactions — explicit bump", () => {
  it("refetches accounts and the projection after a create", async () => {
    mockFetchWithMutation(ok(savedCoffee));

    const { result } = renderHook(
      () => {
        useBumpProbes();
        return useAllMonthTransactions(ACCOUNT_IDS, MONTH);
      },
      { wrapper: Providers }
    );

    await waitFor(() => {
      expect(countRequests(isAccountsList)).toBeGreaterThan(0);
    });

    const accountsBefore = countRequests(isAccountsList);
    const projectionBefore = countRequests(isProjection);

    await act(async () => {
      await result.current.create("acc-1", COFFEE);
    });

    await waitFor(() => {
      expect(countRequests(isAccountsList)).toBeGreaterThan(accountsBefore);
    });
    expect(countRequests(isProjection)).toBeGreaterThan(projectionBefore);
  });

  it("refetches accounts and the projection after a delete", async () => {
    mockFetchWithMutation(ok({}));

    const { result } = renderHook(
      () => {
        useBumpProbes();
        return useAllMonthTransactions(ACCOUNT_IDS, MONTH);
      },
      { wrapper: Providers }
    );

    await waitFor(() => {
      expect(countRequests(isAccountsList)).toBeGreaterThan(0);
    });

    const accountsBefore = countRequests(isAccountsList);
    const projectionBefore = countRequests(isProjection);

    await act(async () => {
      await result.current.remove("txn-1");
    });

    await waitFor(() => {
      expect(countRequests(isAccountsList)).toBeGreaterThan(accountsBefore);
    });
    expect(countRequests(isProjection)).toBeGreaterThan(projectionBefore);
  });
});
