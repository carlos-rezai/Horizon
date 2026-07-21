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
import CacheProvider from "../../components/CacheProvider/CacheProvider";
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
