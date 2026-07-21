import { createContext, useContext } from "react";
import type { ResourceCache } from "./resourceCache";

export const CacheContext = createContext<ResourceCache | null>(null);

/**
 * Resolves the cache held by the nearest `CacheProvider`. Shared by every
 * public cache hook, so each one fails the same way — loudly — when it is
 * mounted outside the provider rather than silently reading nothing.
 */
export function useCache(hookName: string): ResourceCache {
  const cache = useContext(CacheContext);
  if (!cache) {
    throw new Error(`${hookName} must be used within a CacheProvider`);
  }
  return cache;
}
