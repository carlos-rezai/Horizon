// @vitest-environment jsdom
import { useState, type ReactNode } from "react";
import {
  render,
  screen,
  cleanup,
  waitFor,
  renderHook,
  act,
} from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import CacheProvider from "./CacheProvider";
import { useCachedResource } from "./useCachedResource";

/**
 * Reads a key through the cache and renders the result as text, so a test can
 * observe exactly what a consumer paints on any given render — including the
 * very first frame after a remount.
 */
function Consumer({
  cacheKey,
  fetcher,
  testId = "consumer",
}: {
  cacheKey: string;
  fetcher: () => Promise<string>;
  testId?: string;
}) {
  const { data, isLoading, error } = useCachedResource(cacheKey, fetcher);
  return (
    <div data-testid={testId}>
      {isLoading ? "loading" : error ? `error:${error}` : (data ?? "empty")}
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

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("useCachedResource — cold read", () => {
  it("reports loading, then paints the fetched value", async () => {
    const fetcher = vi.fn(() => Promise.resolve("v1"));

    render(
      <CacheProvider>
        <Consumer cacheKey="accounts" fetcher={fetcher} />
      </CacheProvider>
    );

    expect(screen.getByTestId("consumer")).toHaveTextContent("loading");

    await waitFor(() => {
      expect(screen.getByTestId("consumer")).toHaveTextContent("v1");
    });
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

describe("useCachedResource — instant revisit", () => {
  it("paints the cached value on the first frame after a remount, with no loading flash", async () => {
    const fetcher = vi.fn(() => Promise.resolve("v1"));
    const consumer = <Consumer cacheKey="accounts" fetcher={fetcher} />;

    const { rerender } = render(<Harness visible>{consumer}</Harness>);
    await waitFor(() => {
      expect(screen.getByTestId("consumer")).toHaveTextContent("v1");
    });

    // Navigate away…
    rerender(<Harness visible={false}>{consumer}</Harness>);
    expect(screen.queryByTestId("consumer")).toBeNull();

    // …and back: the value is there immediately, without passing through
    // a loading state first.
    rerender(<Harness visible>{consumer}</Harness>);
    expect(screen.getByTestId("consumer")).toHaveTextContent("v1");
  });

  it("reconciles a stale cached value to the revalidated one", async () => {
    let call = 0;
    const fetcher = vi.fn(() => Promise.resolve(call++ === 0 ? "v1" : "v2"));
    const consumer = <Consumer cacheKey="accounts" fetcher={fetcher} />;

    const { rerender } = render(<Harness visible>{consumer}</Harness>);
    await waitFor(() => {
      expect(screen.getByTestId("consumer")).toHaveTextContent("v1");
    });

    rerender(<Harness visible={false}>{consumer}</Harness>);
    rerender(<Harness visible>{consumer}</Harness>);

    // Paints the stale value first…
    expect(screen.getByTestId("consumer")).toHaveTextContent("v1");
    // …then the background revalidation reconciles it.
    await waitFor(() => {
      expect(screen.getByTestId("consumer")).toHaveTextContent("v2");
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

describe("useCachedResource — in-flight dedup", () => {
  it("shares a single request across concurrent reads of the same key", async () => {
    let resolveFetch: ((value: string) => void) | undefined;
    const fetcher = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolveFetch = resolve;
        })
    );

    render(
      <CacheProvider>
        <Consumer cacheKey="accounts" fetcher={fetcher} testId="a" />
        <Consumer cacheKey="accounts" fetcher={fetcher} testId="b" />
      </CacheProvider>
    );

    expect(fetcher).toHaveBeenCalledTimes(1);

    await act(async () => {
      resolveFetch?.("v1");
    });

    expect(screen.getByTestId("a")).toHaveTextContent("v1");
    expect(screen.getByTestId("b")).toHaveTextContent("v1");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("keeps separate keys independent", async () => {
    const fetcher = vi.fn((value: string) => () => Promise.resolve(value));

    render(
      <CacheProvider>
        <Consumer
          cacheKey="accounts"
          fetcher={fetcher("accounts-v1")}
          testId="a"
        />
        <Consumer
          cacheKey="categories"
          fetcher={fetcher("categories-v1")}
          testId="b"
        />
      </CacheProvider>
    );

    await waitFor(() => {
      expect(screen.getByTestId("a")).toHaveTextContent("accounts-v1");
    });
    expect(screen.getByTestId("b")).toHaveTextContent("categories-v1");
  });
});

describe("useCachedResource — errors", () => {
  it("surfaces a failed fetch as an error state without wedging the cache", async () => {
    let call = 0;
    const fetcher = vi.fn(() =>
      call++ === 0 ? Promise.reject(new Error("boom")) : Promise.resolve("v1")
    );

    const { result } = renderHook(
      () => useCachedResource("accounts", fetcher),
      { wrapper: CacheProvider }
    );

    await waitFor(() => {
      expect(result.current.error).toBe("boom");
    });
    expect(result.current.isLoading).toBe(false);

    // A later read of the same key still succeeds.
    act(() => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.data).toBe("v1");
    });
    expect(result.current.error).toBeNull();
  });
});

describe("useCachedResource — refresh", () => {
  it("forces a refetch and reconciles to the new value", async () => {
    let call = 0;
    const fetcher = vi.fn(() => Promise.resolve(call++ === 0 ? "v1" : "v2"));

    const { result } = renderHook(
      () => useCachedResource("accounts", fetcher),
      { wrapper: CacheProvider }
    );

    await waitFor(() => {
      expect(result.current.data).toBe("v1");
    });

    act(() => {
      result.current.refresh();
    });

    await waitFor(() => {
      expect(result.current.data).toBe("v2");
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
});

describe("useCachedResource — provider contract", () => {
  it("throws when used outside a CacheProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      renderHook(() =>
        useCachedResource("accounts", () => Promise.resolve("v1"))
      )
    ).toThrow();
    spy.mockRestore();
  });

  it("keeps cached values across consumers mounted at different times", async () => {
    const fetcher = vi.fn(() => Promise.resolve("v1"));

    function TwoStage() {
      const [showSecond, setShowSecond] = useState(false);
      return (
        <CacheProvider>
          <Consumer cacheKey="accounts" fetcher={fetcher} testId="a" />
          {showSecond && (
            <Consumer cacheKey="accounts" fetcher={fetcher} testId="b" />
          )}
          <button onClick={() => setShowSecond(true)}>show</button>
        </CacheProvider>
      );
    }

    render(<TwoStage />);
    await waitFor(() => {
      expect(screen.getByTestId("a")).toHaveTextContent("v1");
    });

    act(() => {
      screen.getByRole("button", { name: "show" }).click();
    });

    // The late-arriving consumer paints from cache immediately.
    expect(screen.getByTestId("b")).toHaveTextContent("v1");
  });
});
