import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useSyncExternalStore,
} from "react";
import type { ResourceCache } from "./resourceCache";

export const CacheContext = createContext<ResourceCache | null>(null);

export interface CachedResource<T> {
  data: T | undefined;
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

function useCache(): ResourceCache {
  const cache = useContext(CacheContext);
  if (!cache) {
    throw new Error("useCachedResource must be used within a CacheProvider");
  }
  return cache;
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
  key: string,
  fetcher: () => Promise<T>
): CachedResource<T> {
  const cache = useCache();
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

  return {
    data: entry.hasValue ? (entry.value as T) : undefined,
    isLoading: !entry.hasValue && entry.error === null,
    error: entry.error,
    refresh,
  };
}
