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

/** Paints a month's transaction descriptions as text. */
function Consumer({
  accountId,
  month,
  testId = "consumer",
}: {
  accountId: string;
  month: string;
  testId?: string;
}) {
  const { transactions, isLoading } = useMonthTransactions(accountId, month);
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

/** Requests seen so far, as `METHOD url` strings. */
function requests(): string[] {
  return vi
    .mocked(fetch)
    .mock.calls.map(
      ([url, init]) =>
        `${(init as RequestInit | undefined)?.method ?? "GET"} ${String(url)}`
    );
}

function countMatching(predicate: (request: string) => boolean): number {
  return requests().filter(predicate).length;
}

const isAccountsList = (r: string) => r.endsWith("/accounts");
const isProjection = (r: string) => r.includes("/projection");

beforeEach(() => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    json: async () => [mayTransaction],
  } as Response);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("useMonthTransactions — initial fetch", () => {
  it("fetches GET /accounts/:id/transactions?month=YYYY-MM on mount", async () => {
    renderHook(() => useMonthTransactions(ACCOUNT_ID, MONTH), {
      wrapper: CacheProvider,
    });

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
    const { result } = renderHook(
      () => useMonthTransactions(ACCOUNT_ID, MONTH),
      { wrapper: CacheProvider }
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

    const { result } = renderHook(
      () => useMonthTransactions(ACCOUNT_ID, MONTH),
      { wrapper: CacheProvider }
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

    const { result } = renderHook(
      () => useMonthTransactions(ACCOUNT_ID, MONTH),
      { wrapper: CacheProvider }
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

    const { result } = renderHook(
      () => useMonthTransactions(ACCOUNT_ID, MONTH),
      { wrapper: CacheProvider }
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

describe("useMonthTransactions — per account and month caching", () => {
  it("shares one request per account+month and fetches each distinct pair once", async () => {
    renderHook(
      () => ({
        may: useMonthTransactions("acc-1", "2026-05"),
        mayAgain: useMonthTransactions("acc-1", "2026-05"),
        june: useMonthTransactions("acc-1", "2026-06"),
        otherAccount: useMonthTransactions("acc-2", "2026-05"),
      }),
      { wrapper: CacheProvider }
    );

    await act(async () => {});

    expect(
      countMatching((r) => r.includes("acc-1") && r.includes("month=2026-05"))
    ).toBe(1);
    expect(
      countMatching((r) => r.includes("acc-1") && r.includes("month=2026-06"))
    ).toBe(1);
    expect(
      countMatching((r) => r.includes("acc-2") && r.includes("month=2026-05"))
    ).toBe(1);
  });

  it("paints a previously read month on the first frame after a remount", async () => {
    const consumer = <Consumer accountId={ACCOUNT_ID} month={MONTH} />;

    const { rerender } = render(<Harness visible>{consumer}</Harness>);
    await waitFor(() => {
      expect(screen.getByTestId("consumer")).toHaveTextContent("Groceries");
    });

    rerender(<Harness visible={false}>{consumer}</Harness>);
    rerender(<Harness visible>{consumer}</Harness>);

    expect(screen.getByTestId("consumer")).toHaveTextContent("Groceries");
  });
});

/**
 * A promise plus the handles to settle it, so a test can hold the server
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

/** The full chrome a mutation needs: the cache to write to, snackbars to fail into. */
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

/** Serves the month list on GET and hands every mutation the given response. */
function mockFetchWithMutation(response: Promise<Response> | Response): void {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (_input, init) => {
    const method = (init as RequestInit | undefined)?.method ?? "GET";
    if (method === "GET") return ok([mayTransaction]);
    return response;
  });
}

const CREATE_PAYLOAD = {
  date: "2026-05-15",
  amount: -8000,
  description: "Restaurant",
  category: "Food",
};

const UPDATE_PAYLOAD = {
  date: "2026-05-10",
  amount: -6000,
  description: "Groceries (updated)",
  category: "Food",
};

describe("useMonthTransactions — optimistic create", () => {
  it("shows the new transaction before the server responds", async () => {
    const post = deferred<Response>();
    mockFetchWithMutation(post.promise);

    const { result } = renderHook(
      () => useMonthTransactions(ACCOUNT_ID, MONTH),
      { wrapper: Providers }
    );
    await act(async () => {});

    let pending!: Promise<void>;
    act(() => {
      pending = result.current.create(CREATE_PAYLOAD);
    });

    expect(describes(result.current.transactions)).toEqual([
      "Groceries",
      "Restaurant",
    ]);

    await act(async () => {
      post.resolve(ok(newTransaction));
      await pending;
    });
  });

  it("swaps the provisional id for the server id in the row's own position", async () => {
    const post = deferred<Response>();
    mockFetchWithMutation(post.promise);

    const { result } = renderHook(
      () => useMonthTransactions(ACCOUNT_ID, MONTH),
      { wrapper: Providers }
    );
    await act(async () => {});

    let pending!: Promise<void>;
    act(() => {
      pending = result.current.create(CREATE_PAYLOAD);
    });

    // Painted, but not yet carrying the id the server will assign.
    const provisionalIds = idsOf(result.current.transactions);
    expect(provisionalIds).toHaveLength(2);
    expect(provisionalIds[1]).not.toBe("txn-2");

    await act(async () => {
      post.resolve(ok(newTransaction));
      await pending;
    });

    expect(idsOf(result.current.transactions)).toEqual(["txn-1", "txn-2"]);
    expect(describes(result.current.transactions)).toEqual([
      "Groceries",
      "Restaurant",
    ]);
  });
});

describe("useMonthTransactions — optimistic update and remove", () => {
  it("applies an edit in place before the server responds", async () => {
    const patch = deferred<Response>();
    mockFetchWithMutation(patch.promise);

    const { result } = renderHook(
      () => useMonthTransactions(ACCOUNT_ID, MONTH),
      { wrapper: Providers }
    );
    await act(async () => {});

    let pending!: Promise<void>;
    act(() => {
      pending = result.current.update("txn-1", UPDATE_PAYLOAD);
    });

    expect(describes(result.current.transactions)).toEqual([
      "Groceries (updated)",
    ]);

    await act(async () => {
      patch.resolve(ok(updatedTransaction));
      await pending;
    });
  });

  it("removes a transaction before the server responds", async () => {
    const del = deferred<Response>();
    mockFetchWithMutation(del.promise);

    const { result } = renderHook(
      () => useMonthTransactions(ACCOUNT_ID, MONTH),
      { wrapper: Providers }
    );
    await act(async () => {});

    let pending!: Promise<void>;
    act(() => {
      pending = result.current.remove("txn-1");
    });

    expect(result.current.transactions).toEqual([]);

    await act(async () => {
      del.resolve(ok({}));
      await pending;
    });
  });
});

describe("useMonthTransactions — rollback on a rejected mutation", () => {
  it("restores the exact previous list when a create is rejected", async () => {
    mockFetchWithMutation(rejected("Nope"));

    const { result } = renderHook(
      () => useMonthTransactions(ACCOUNT_ID, MONTH),
      { wrapper: Providers }
    );
    await act(async () => {});

    await act(async () => {
      await result.current.create(CREATE_PAYLOAD);
    });

    expect(result.current.transactions).toEqual([mayTransaction]);
  });

  it("notifies the user when a create is rejected", async () => {
    mockFetchWithMutation(rejected("Nope"));

    const { result } = renderHook(
      () => useMonthTransactions(ACCOUNT_ID, MONTH),
      { wrapper: Providers }
    );
    await act(async () => {});

    await act(async () => {
      await result.current.create(CREATE_PAYLOAD);
    });

    expect(screen.getByRole("status")).toHaveAttribute("data-variant", "error");
  });

  it("restores the exact previous list and notifies when an edit is rejected", async () => {
    mockFetchWithMutation(rejected("Nope"));

    const { result } = renderHook(
      () => useMonthTransactions(ACCOUNT_ID, MONTH),
      { wrapper: Providers }
    );
    await act(async () => {});

    await act(async () => {
      await result.current.update("txn-1", UPDATE_PAYLOAD);
    });

    expect(result.current.transactions).toEqual([mayTransaction]);
    expect(screen.getByRole("status")).toHaveAttribute("data-variant", "error");
  });

  it("restores the exact previous list and notifies when a delete is rejected", async () => {
    mockFetchWithMutation(rejected("Nope"));

    const { result } = renderHook(
      () => useMonthTransactions(ACCOUNT_ID, MONTH),
      { wrapper: Providers }
    );
    await act(async () => {});

    await act(async () => {
      await result.current.remove("txn-1");
    });

    expect(result.current.transactions).toEqual([mayTransaction]);
    expect(screen.getByRole("status")).toHaveAttribute("data-variant", "error");
  });

  it("reports the failure through the notification rather than by rejecting", async () => {
    mockFetchWithMutation(rejected("Nope"));

    const { result } = renderHook(
      () => useMonthTransactions(ACCOUNT_ID, MONTH),
      { wrapper: Providers }
    );
    await act(async () => {});

    await act(async () => {
      await expect(
        result.current.create(CREATE_PAYLOAD)
      ).resolves.toBeUndefined();
    });
  });
});

describe("useMonthTransactions — explicit bump", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      const method = (init as RequestInit | undefined)?.method ?? "GET";

      if (url.includes("/projection")) {
        return { ok: true, json: async () => [] } as Response;
      }
      if (url.includes("/transactions")) {
        if (method === "POST") {
          return { ok: true, json: async () => newTransaction } as Response;
        }
        if (method === "DELETE") {
          return { ok: true, json: async () => ({}) } as Response;
        }
        return { ok: true, json: async () => [mayTransaction] } as Response;
      }
      return { ok: true, json: async () => [] } as Response;
    });
  });

  it("refetches accounts and the projection after a create", async () => {
    const { result } = renderHook(
      () => ({
        accounts: useAccounts(),
        projection: useProjection(),
        month: useMonthTransactions(ACCOUNT_ID, MONTH),
      }),
      { wrapper: CacheProvider }
    );

    await waitFor(() => {
      expect(result.current.month.transactions).toEqual([mayTransaction]);
    });

    const accountsBefore = countMatching(isAccountsList);
    const projectionBefore = countMatching(isProjection);

    await act(async () => {
      await result.current.month.create({
        date: "2026-05-15",
        amount: -8000,
        description: "Restaurant",
        category: "Food",
      });
    });

    await waitFor(() => {
      expect(countMatching(isAccountsList)).toBeGreaterThan(accountsBefore);
    });
    expect(countMatching(isProjection)).toBeGreaterThan(projectionBefore);
  });

  it("refetches accounts and the projection after a remove", async () => {
    const { result } = renderHook(
      () => ({
        accounts: useAccounts(),
        projection: useProjection(),
        month: useMonthTransactions(ACCOUNT_ID, MONTH),
      }),
      { wrapper: CacheProvider }
    );

    await waitFor(() => {
      expect(result.current.month.transactions).toEqual([mayTransaction]);
    });

    const accountsBefore = countMatching(isAccountsList);
    const projectionBefore = countMatching(isProjection);

    await act(async () => {
      await result.current.month.remove("txn-1");
    });

    await waitFor(() => {
      expect(countMatching(isAccountsList)).toBeGreaterThan(accountsBefore);
    });
    expect(countMatching(isProjection)).toBeGreaterThan(projectionBefore);
  });
});
