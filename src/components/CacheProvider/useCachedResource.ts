import { useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import type { CacheKey } from "./cacheKeys";
import { useCache } from "./cacheContext";

export interface CachedResource<T> {
  data: T | undefined;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
  /**
   * Publishes a value to every reader of the key without refetching it.
   * Accepts an updater, which is applied to whatever is cached at write time.
   */
  setData: (value: T | ((previous: T | undefined) => T)) => void;
}

/**
 * Reads a keyed resource through the app cache.
 *
 * The first read fetches; every later read of the same key paints the cached
 * value on its first frame and reconciles once a background revalidation
 * lands. Reads that overlap share one request. `fetcher` is read fresh on each
 * call, so an inline closure is fine — its identity never restarts a fetch.
 */
export function useCachedResource<T>(
  key: CacheKey,
  fetcher: () => Promise<T>
): CachedResource<T> {
  const cache = useCache("useCachedResource");
  const fetcherRef = useRef(fetcher);

  useEffect(() => {
    fetcherRef.current = fetcher;
  });

  const entry = useSyncExternalStore(
    useCallback(
      (onChange: () => void) => cache.subscribe(key, onChange),
      [cache, key]
    ),
    useCallback(() => cache.getEntry(key), [cache, key])
  );

  useEffect(() => {
    cache.read(key, () => fetcherRef.current());
  }, [cache, key]);

  const refresh = useCallback(() => {
    cache.read(key, () => fetcherRef.current(), true);
  }, [cache, key]);

  const setData = useCallback(
    (value: T | ((previous: T | undefined) => T)) => {
      cache.setData(key, value);
    },
    [cache, key]
  );

  return {
    data: entry.hasValue ? (entry.value as T) : undefined,
    isLoading: !entry.hasValue && entry.error === null,
    error: entry.error,
    refresh,
    setData,
  };
}
