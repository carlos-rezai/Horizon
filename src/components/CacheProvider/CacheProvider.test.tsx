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
import { ACCOUNTS, CATEGORIES, PROJECTION, type CacheKey } from "./cacheKeys";
import { useCachedResource } from "./useCachedResource";
import { useCacheBump } from "./useCacheBump";

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
  cacheKey: CacheKey;
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

/**
 * A consumer that can also write straight into the cache entry, so a test can
 * observe a write-through the same way a mutating hook performs one.
 */
function WritingConsumer({
  cacheKey,
  fetcher,
  next,
  testId = "consumer",
}: {
  cacheKey: CacheKey;
  fetcher: () => Promise<string>;
  next: string;
  testId?: string;
}) {
  const { data, isLoading, setData } = useCachedResource<string>(
    cacheKey,
    fetcher
  );
  return (
    <div>
      <div data-testid={testId}>
        {isLoading ? "loading" : (data ?? "empty")}
      </div>
      <button onClick={() => setData(next)}>write</button>
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
        <Consumer cacheKey={ACCOUNTS} fetcher={fetcher} />
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
    const consumer = <Consumer cacheKey={ACCOUNTS} fetcher={fetcher} />;

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
    const consumer = <Consumer cacheKey={ACCOUNTS} fetcher={fetcher} />;

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
        <Consumer cacheKey={ACCOUNTS} fetcher={fetcher} testId="a" />
        <Consumer cacheKey={ACCOUNTS} fetcher={fetcher} testId="b" />
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
          cacheKey={ACCOUNTS}
          fetcher={fetcher("accounts-v1")}
          testId="a"
        />
        <Consumer
          cacheKey={CATEGORIES}
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

    const { result } = renderHook(() => useCachedResource(ACCOUNTS, fetcher), {
      wrapper: CacheProvider,
    });

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

    const { result } = renderHook(() => useCachedResource(ACCOUNTS, fetcher), {
      wrapper: CacheProvider,
    });

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
      renderHook(() => useCachedResource(ACCOUNTS, () => Promise.resolve("v1")))
    ).toThrow();
    spy.mockRestore();
  });

  it("throws when useCacheBump is used outside a CacheProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useCacheBump())).toThrow();
    spy.mockRestore();
  });

  it("keeps cached values across consumers mounted at different times", async () => {
    const fetcher = vi.fn(() => Promise.resolve("v1"));

    function TwoStage() {
      const [showSecond, setShowSecond] = useState(false);
      return (
        <CacheProvider>
          <Consumer cacheKey={ACCOUNTS} fetcher={fetcher} testId="a" />
          {showSecond && (
            <Consumer cacheKey={ACCOUNTS} fetcher={fetcher} testId="b" />
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

describe("useCacheBump — explicit bump", () => {
  it("forces the bumped key to refetch and repaints the fresh value", async () => {
    let call = 0;
    const fetcher = vi.fn(() => Promise.resolve(call++ === 0 ? "v1" : "v2"));

    const { result } = renderHook(
      () => ({
        accounts: useCachedResource(ACCOUNTS, fetcher),
        bump: useCacheBump(),
      }),
      { wrapper: CacheProvider }
    );

    await waitFor(() => {
      expect(result.current.accounts.data).toBe("v1");
    });

    act(() => {
      result.current.bump(ACCOUNTS);
    });

    await waitFor(() => {
      expect(result.current.accounts.data).toBe("v2");
    });
    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("starts a new request rather than joining the one already in flight", () => {
    const resolvers: ((value: string) => void)[] = [];
    const fetcher = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolvers.push(resolve);
        })
    );

    const { result } = renderHook(
      () => ({
        accounts: useCachedResource(ACCOUNTS, fetcher),
        bump: useCacheBump(),
      }),
      { wrapper: CacheProvider }
    );

    expect(fetcher).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.bump(ACCOUNTS);
    });

    expect(fetcher).toHaveBeenCalledTimes(2);
  });

  it("does not let the superseded response clobber the bumped one", async () => {
    const resolvers: ((value: string) => void)[] = [];
    const fetcher = vi.fn(
      () =>
        new Promise<string>((resolve) => {
          resolvers.push(resolve);
        })
    );

    const { result } = renderHook(
      () => ({
        accounts: useCachedResource(ACCOUNTS, fetcher),
        bump: useCacheBump(),
      }),
      { wrapper: CacheProvider }
    );

    act(() => {
      result.current.bump(ACCOUNTS);
    });

    // The post-bump request lands first…
    await act(async () => {
      resolvers[1]("fresh");
    });
    expect(result.current.accounts.data).toBe("fresh");

    // …and the pre-bump one, arriving late, is ignored.
    await act(async () => {
      resolvers[0]("stale");
    });
    expect(result.current.accounts.data).toBe("fresh");
  });

  it("leaves keys it was not given untouched", async () => {
    const accountsFetcher = vi.fn(() => Promise.resolve("accounts-v1"));
    const categoriesFetcher = vi.fn(() => Promise.resolve("categories-v1"));

    const { result } = renderHook(
      () => ({
        accounts: useCachedResource(ACCOUNTS, accountsFetcher),
        categories: useCachedResource(CATEGORIES, categoriesFetcher),
        bump: useCacheBump(),
      }),
      { wrapper: CacheProvider }
    );

    await waitFor(() => {
      expect(result.current.accounts.data).toBe("accounts-v1");
    });
    expect(categoriesFetcher).toHaveBeenCalledTimes(1);

    act(() => {
      result.current.bump(ACCOUNTS);
    });

    await waitFor(() => {
      expect(accountsFetcher).toHaveBeenCalledTimes(2);
    });
    expect(categoriesFetcher).toHaveBeenCalledTimes(1);
  });

  it("bumps several keys in one call", async () => {
    const accountsFetcher = vi.fn(() => Promise.resolve("accounts-v1"));
    const projectionFetcher = vi.fn(() => Promise.resolve("projection-v1"));

    const { result } = renderHook(
      () => ({
        accounts: useCachedResource(ACCOUNTS, accountsFetcher),
        projection: useCachedResource(PROJECTION, projectionFetcher),
        bump: useCacheBump(),
      }),
      { wrapper: CacheProvider }
    );

    await waitFor(() => {
      expect(result.current.projection.data).toBe("projection-v1");
    });

    act(() => {
      result.current.bump(ACCOUNTS, PROJECTION);
    });

    await waitFor(() => {
      expect(accountsFetcher).toHaveBeenCalledTimes(2);
    });
    expect(projectionFetcher).toHaveBeenCalledTimes(2);
  });
});

describe("useCachedResource — write-through", () => {
  it("publishes a written value to every consumer of the key without refetching", async () => {
    const fetcher = vi.fn(() => Promise.resolve("v1"));

    const { result } = renderHook(
      () => ({
        a: useCachedResource<string>(ACCOUNTS, fetcher),
        b: useCachedResource<string>(ACCOUNTS, fetcher),
      }),
      { wrapper: CacheProvider }
    );

    await waitFor(() => {
      expect(result.current.a.data).toBe("v1");
    });

    act(() => {
      result.current.a.setData("written");
    });

    expect(result.current.a.data).toBe("written");
    expect(result.current.b.data).toBe("written");
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("keeps a written value in the cache across a remount", async () => {
    const fetcher = vi.fn(() => Promise.resolve("v1"));
    const consumer = (
      <WritingConsumer cacheKey={ACCOUNTS} fetcher={fetcher} next="written" />
    );

    const { rerender } = render(<Harness visible>{consumer}</Harness>);
    await waitFor(() => {
      expect(screen.getByTestId("consumer")).toHaveTextContent("v1");
    });

    act(() => {
      screen.getByRole("button", { name: "write" }).click();
    });
    expect(screen.getByTestId("consumer")).toHaveTextContent("written");

    rerender(<Harness visible={false}>{consumer}</Harness>);
    rerender(<Harness visible>{consumer}</Harness>);

    // The written value came from the cache, not from local component state.
    expect(screen.getByTestId("consumer")).toHaveTextContent("written");
  });
});
