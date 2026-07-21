import { useState, type ReactNode } from "react";
import { ResourceCache } from "./resourceCache";
import { CacheContext } from "./cacheContext";

interface CacheProviderProps {
  children: ReactNode;
}

/**
 * Owns the app's in-memory resource cache for the lifetime of its mount.
 *
 * Mount this once above the router: `AppLayout` wraps each route separately
 * and remounts on navigation, so a cache held there would be discarded on
 * every page change — exactly the case this provider exists to serve.
 */
export default function CacheProvider({ children }: CacheProviderProps) {
  const [cache] = useState(() => new ResourceCache());

  return (
    <CacheContext.Provider value={cache}>{children}</CacheContext.Provider>
  );
}
