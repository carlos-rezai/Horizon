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
import { useProjection } from "./useProjection";
import type { MonthlySnapshot } from "../../types/projection";

const snapshot: MonthlySnapshot = {
  month: "2026-04",
  accounts: {},
  netCashflow: 0,
  totalLiquid: 0,
};

const laterSnapshot: MonthlySnapshot = {
  month: "2026-05",
  accounts: {},
  netCashflow: 0,
  totalLiquid: 250000,
};

/** Reads the projection and paints its first snapshot's month as text. */
function Consumer({ testId = "consumer" }: { testId?: string }) {
  const { snapshots, isLoading } = useProjection();
  return (
    <div data-testid={testId}>
      {isLoading ? "loading" : (snapshots[0]?.month ?? "empty")}
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
    json: async () => [snapshot],
  } as Response);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("useProjection", () => {
  it("fetches /projection?months=240", async () => {
    renderHook(() => useProjection(), { wrapper: CacheProvider });

    await act(async () => {});

    const [url] = (globalThis.fetch as ReturnType<typeof vi.fn>).mock
      .calls[0] as [string];
    expect(url).toContain("?months=240");
  });

  it("returns the snapshots with the loading and error fields it always had", async () => {
    const { result } = renderHook(() => useProjection(), {
      wrapper: CacheProvider,
    });

    expect(result.current.isLoading).toBe(true);
    expect(result.current.snapshots).toEqual([]);

    await waitFor(() => {
      expect(result.current.snapshots).toEqual([snapshot]);
    });
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });
});

describe("useProjection — shared cache", () => {
  it("serves two concurrent readers from a single request", async () => {
    const { result } = renderHook(
      () => ({ a: useProjection(), b: useProjection() }),
      { wrapper: CacheProvider }
    );

    await waitFor(() => {
      expect(result.current.a.snapshots).toEqual([snapshot]);
    });
    expect(result.current.b.snapshots).toEqual([snapshot]);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });

  it("paints the cached projection on the first frame after a remount", async () => {
    const consumer = <Consumer />;

    const { rerender } = render(<Harness visible>{consumer}</Harness>);
    await waitFor(() => {
      expect(screen.getByTestId("consumer")).toHaveTextContent("2026-04");
    });

    rerender(<Harness visible={false}>{consumer}</Harness>);
    rerender(<Harness visible>{consumer}</Harness>);

    expect(screen.getByTestId("consumer")).toHaveTextContent("2026-04");
  });
});

describe("useProjection — refetch", () => {
  it("forces a refetch and reconciles to the new snapshots", async () => {
    let call = 0;
    vi.spyOn(globalThis, "fetch").mockImplementation(
      async () =>
        ({
          ok: true,
          json: async () => (call++ === 0 ? [snapshot] : [laterSnapshot]),
        }) as Response
    );

    const { result } = renderHook(() => useProjection(), {
      wrapper: CacheProvider,
    });

    await waitFor(() => {
      expect(result.current.snapshots).toEqual([snapshot]);
    });

    act(() => {
      result.current.refetch();
    });

    await waitFor(() => {
      expect(result.current.snapshots).toEqual([laterSnapshot]);
    });
  });
});
