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

/** Paints the loaded recurring descriptions as text. */
function Consumer({ testId = "consumer" }: { testId?: string }) {
  const { recurringTransactions, isLoading } = useAllRecurringTransactions();
  return (
    <div data-testid={testId}>
      {isLoading
        ? "loading"
        : recurringTransactions.map((rt) => rt.description).join(",") ||
          "empty"}
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
  vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    json: async () => [rt1, rt2],
  } as Response);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("useAllRecurringTransactions", () => {
  it("returns all recurring transactions without filtering by accountId", async () => {
    const { result } = renderHook(() => useAllRecurringTransactions(), {
      wrapper: CacheProvider,
    });

    await act(async () => {});

    expect(result.current.recurringTransactions).toHaveLength(2);
    expect(result.current.recurringTransactions).toContainEqual(rt1);
    expect(result.current.recurringTransactions).toContainEqual(rt2);
  });

  it("starts in a loading state and resolves after fetch", async () => {
    const { result } = renderHook(() => useAllRecurringTransactions(), {
      wrapper: CacheProvider,
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {});

    expect(result.current.isLoading).toBe(false);
  });
});

describe("useAllRecurringTransactions — shared cache", () => {
  it("serves two concurrent readers from a single request", async () => {
    const { result } = renderHook(
      () => ({
        a: useAllRecurringTransactions(),
        b: useAllRecurringTransactions(),
      }),
      { wrapper: CacheProvider }
    );

    await waitFor(() => {
      expect(result.current.a.recurringTransactions).toHaveLength(2);
    });
    expect(result.current.b.recurringTransactions).toHaveLength(2);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });

  it("paints the cached recurring transactions on the first frame after a remount", async () => {
    const consumer = <Consumer />;

    const { rerender } = render(<Harness visible>{consumer}</Harness>);
    await waitFor(() => {
      expect(screen.getByTestId("consumer")).toHaveTextContent(
        "Rent,Sondertilgung"
      );
    });

    rerender(<Harness visible={false}>{consumer}</Harness>);
    rerender(<Harness visible>{consumer}</Harness>);

    expect(screen.getByTestId("consumer")).toHaveTextContent(
      "Rent,Sondertilgung"
    );
  });
});
