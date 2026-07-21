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
import { useCategories } from "./useCategories";
import type { Category } from "../../types/category";

const food: Category = {
  id: "cat-1",
  name: "Food",
  isDefault: true,
  color: "#C9A227",
  hidden: false,
};

const travel: Category = {
  id: "cat-2",
  name: "Travel",
  isDefault: false,
  color: "#7FA7D9",
  hidden: false,
};

/** Paints the loaded category names as text. */
function Consumer({ testId = "consumer" }: { testId?: string }) {
  const { categories } = useCategories();
  return (
    <div data-testid={testId}>
      {categories.map((c) => c.name).join(",") || "empty"}
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
    json: async () => [food, travel],
  } as Response);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("useCategories", () => {
  it("returns an empty list before the fetch resolves, then the fetched categories", async () => {
    const { result } = renderHook(() => useCategories(), {
      wrapper: CacheProvider,
    });

    expect(result.current.categories).toEqual([]);

    await waitFor(() => {
      expect(result.current.categories).toEqual([food, travel]);
    });
  });

  it("fetches GET /categories", async () => {
    renderHook(() => useCategories(), { wrapper: CacheProvider });

    await act(async () => {});

    const [url] = vi.mocked(fetch).mock.calls[0] as [string];
    expect(url).toContain("/categories");
  });

  it("falls back to an empty list when the fetch fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: false,
      status: 500,
      json: async () => ({}),
    } as Response);

    const { result } = renderHook(() => useCategories(), {
      wrapper: CacheProvider,
    });

    await act(async () => {});

    expect(result.current.categories).toEqual([]);
  });
});

describe("useCategories — shared cache", () => {
  it("serves two concurrent readers from a single request", async () => {
    const { result } = renderHook(
      () => ({ a: useCategories(), b: useCategories() }),
      { wrapper: CacheProvider }
    );

    await waitFor(() => {
      expect(result.current.a.categories).toEqual([food, travel]);
    });
    expect(result.current.b.categories).toEqual([food, travel]);
    expect(vi.mocked(fetch)).toHaveBeenCalledTimes(1);
  });

  it("paints the cached categories on the first frame after a remount", async () => {
    const consumer = <Consumer />;

    const { rerender } = render(<Harness visible>{consumer}</Harness>);
    await waitFor(() => {
      expect(screen.getByTestId("consumer")).toHaveTextContent("Food,Travel");
    });

    rerender(<Harness visible={false}>{consumer}</Harness>);
    rerender(<Harness visible>{consumer}</Harness>);

    expect(screen.getByTestId("consumer")).toHaveTextContent("Food,Travel");
  });
});
