import { useCallback } from "react";
import type { CacheKey } from "./cacheKeys";
import { useCache } from "./cacheContext";

/**
 * Returns a function that invalidates cached resources by key.
 *
 * A mutation usually changes more than the list it was aimed at: recording an
 * expense moves an account balance and the whole projection with it. The hook
 * performing the mutation bumps those keys, and every view reading them —
 * including ones mounted elsewhere on the page — reconciles to fresh values
 * instead of showing stale numbers until the next navigation.
 */
export function useCacheBump(): (...keys: CacheKey[]) => void {
  const cache = useCache("useCacheBump");

  return useCallback(
    (...keys: CacheKey[]) => {
      cache.invalidate(keys);
    },
    [cache]
  );
}
