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
import CacheProvider from "../../../components/CacheProvider/CacheProvider";
import {
  monthCashFlowKey,
  monthTransactionsKey,
} from "../../../components/CacheProvider/cacheKeys";
import type { MonthCashFlowReport } from "../../../types/monthCashFlow";
import { useMonthCashFlow } from "./useMonthCashFlow";

function reportFor(month: string): MonthCashFlowReport {
  return {
    month,
    accounts: [
      {
        accountId: "main",
        flows: [
          {
            kind: "recurring",
            recurringId: "salary",
            date: `${month}-25`,
            description: `Salary ${month}`,
            category: "Income",
            amount: 300000,
            inAnchor: false,
          },
        ],
      },
    ],
  };
}

function ok(body: unknown): Response {
  return { ok: true, json: async () => body } as Response;
}

/** Answers every report request with the report for its own month. */
function mockReports() {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const month = String(input).match(/month=([\d-]+)/)?.[1] ?? "";
    return ok(reportFor(month));
  });
}

function urls(): string[] {
  return vi.mocked(fetch).mock.calls.map(([url]) => String(url));
}

/** Paints the month's first flow description, or its loading state. */
function Consumer({ month }: { month: string }) {
  const { report, isLoading } = useMonthCashFlow(month);
  return (
    <div data-testid="consumer">
      {isLoading
        ? "loading"
        : (report?.accounts[0]?.flows[0]?.description ?? "empty")}
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

beforeEach(() => mockReports());

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("monthCashFlowKey", () => {
  it("mints one key per month", () => {
    expect(monthCashFlowKey("2026-09")).toBe(monthCashFlowKey("2026-09"));
    expect(monthCashFlowKey("2026-09")).not.toBe(monthCashFlowKey("2026-10"));
  });

  it("never collides with a month's transactions key", () => {
    expect(monthCashFlowKey("2026-09")).not.toBe(
      monthTransactionsKey([], "2026-09")
    );
  });
});

describe("useMonthCashFlow — fetch", () => {
  it("reads GET /reports/month-cash-flow?month=YYYY-MM for the viewed month", async () => {
    renderHook(() => useMonthCashFlow("2026-09"), { wrapper: CacheProvider });

    await act(async () => {});

    expect(
      urls().some(
        (url) =>
          url.includes("/reports/month-cash-flow") &&
          url.includes("month=2026-09")
      )
    ).toBe(true);
  });

  it("is loading until the report lands, then returns it", async () => {
    const { result } = renderHook(() => useMonthCashFlow("2026-09"), {
      wrapper: CacheProvider,
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {});

    expect(result.current.isLoading).toBe(false);
    expect(result.current.report).toEqual(reportFor("2026-09"));
    expect(result.current.error).toBeNull();
  });

  it("reports an error on a failed read", async () => {
    vi.mocked(fetch).mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({ error: "boom" }),
    } as Response);

    const { result } = renderHook(() => useMonthCashFlow("2026-09"), {
      wrapper: CacheProvider,
    });

    await waitFor(() => {
      expect(result.current.error).not.toBeNull();
    });
    expect(result.current.isLoading).toBe(false);
  });

  it("reads the new month's report when the month changes", async () => {
    const { result, rerender } = renderHook(
      ({ month }) => useMonthCashFlow(month),
      { wrapper: CacheProvider, initialProps: { month: "2026-09" } }
    );
    await act(async () => {});

    rerender({ month: "2026-10" });
    await act(async () => {});

    expect(urls().some((url) => url.includes("month=2026-10"))).toBe(true);
    expect(result.current.report?.month).toBe("2026-10");
  });
});

describe("useMonthCashFlow — cache", () => {
  it("paints a revisited month from the cache on the first frame", async () => {
    const consumer = <Consumer month="2026-09" />;

    const { rerender } = render(<Harness visible>{consumer}</Harness>);
    await waitFor(() => {
      expect(screen.getByTestId("consumer")).toHaveTextContent(
        "Salary 2026-09"
      );
    });

    rerender(<Harness visible={false}>{consumer}</Harness>);
    rerender(<Harness visible>{consumer}</Harness>);

    expect(screen.getByTestId("consumer")).toHaveTextContent("Salary 2026-09");
  });

  it("revalidates a revisited month behind the cached frame", async () => {
    const consumer = <Consumer month="2026-09" />;

    const { rerender } = render(<Harness visible>{consumer}</Harness>);
    await waitFor(() => {
      expect(screen.getByTestId("consumer")).toHaveTextContent(
        "Salary 2026-09"
      );
    });
    const readsBefore = urls().filter((u) =>
      u.includes("month=2026-09")
    ).length;

    rerender(<Harness visible={false}>{consumer}</Harness>);
    rerender(<Harness visible>{consumer}</Harness>);

    await waitFor(() => {
      expect(
        urls().filter((u) => u.includes("month=2026-09")).length
      ).toBeGreaterThan(readsBefore);
    });
  });

  it("keeps each month's report under its own key", async () => {
    const { rerender } = render(
      <Harness visible>
        <Consumer month="2026-09" />
      </Harness>
    );
    await waitFor(() => {
      expect(screen.getByTestId("consumer")).toHaveTextContent(
        "Salary 2026-09"
      );
    });

    rerender(
      <Harness visible>
        <Consumer month="2026-10" />
      </Harness>
    );
    await waitFor(() => {
      expect(screen.getByTestId("consumer")).toHaveTextContent(
        "Salary 2026-10"
      );
    });

    rerender(
      <Harness visible>
        <Consumer month="2026-09" />
      </Harness>
    );
    expect(screen.getByTestId("consumer")).toHaveTextContent("Salary 2026-09");
  });
});
