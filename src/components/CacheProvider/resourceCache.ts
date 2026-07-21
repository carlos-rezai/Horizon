/**
 * The cache's private storage: one entry per resource key, plus the bookkeeping
 * needed to share concurrent fetches and ignore superseded ones.
 *
 * None of this is public API. Hooks reach it only through `useCachedResource`,
 * which exposes `{ data, isLoading, error, refresh }` and nothing else.
 */

type Listener = () => void;

export interface CacheEntry {
  readonly value: unknown;
  readonly hasValue: boolean;
  readonly error: string | null;
}

/**
 * Shared identity for "nothing cached yet" — `useSyncExternalStore` compares
 * snapshots by identity, so an unread key must return the same object every
 * time rather than a fresh literal.
 */
const EMPTY_ENTRY: CacheEntry = {
  value: undefined,
  hasValue: false,
  error: null,
};

function messageOf(err: unknown): string {
  return err instanceof Error ? err.message : "Unknown error";
}

export class ResourceCache {
  private readonly entries = new Map<string, CacheEntry>();
  private readonly inFlight = new Set<string>();
  private readonly requestIds = new Map<string, number>();
  private readonly listeners = new Map<string, Set<Listener>>();

  getEntry(key: string): CacheEntry {
    return this.entries.get(key) ?? EMPTY_ENTRY;
  }

  subscribe(key: string, listener: Listener): () => void {
    let keyListeners = this.listeners.get(key);
    if (!keyListeners) {
      keyListeners = new Set();
      this.listeners.set(key, keyListeners);
    }
    keyListeners.add(listener);

    return () => {
      keyListeners.delete(listener);
      if (keyListeners.size === 0) this.listeners.delete(key);
    };
  }

  /**
   * Reads `key` through the cache. A fetch already in flight for the same key
   * is shared rather than duplicated; a forced read (refresh, invalidation)
   * always starts a new request and supersedes whatever was in flight.
   *
   * The cached value is left in place while the request runs — that is what
   * lets a revisit paint immediately and reconcile afterwards.
   */
  read<T>(key: string, fetcher: () => Promise<T>, force = false): void {
    if (this.inFlight.has(key) && !force) return;

    const requestId = (this.requestIds.get(key) ?? 0) + 1;
    this.requestIds.set(key, requestId);
    this.inFlight.add(key);

    if (force) {
      // A forced read starts clean, so an earlier failure cannot outlive the
      // request sent to replace it.
      this.write(key, { ...this.getEntry(key), error: null });
    }

    void (async () => {
      try {
        const value = await fetcher();
        if (this.isCurrent(key, requestId)) {
          this.write(key, { value, hasValue: true, error: null });
        }
      } catch (err) {
        if (this.isCurrent(key, requestId)) {
          // Keep whatever was cached: a failed revalidation degrades to stale
          // data plus an error, it does not blank the view.
          this.write(key, { ...this.getEntry(key), error: messageOf(err) });
        }
      } finally {
        if (this.isCurrent(key, requestId)) this.inFlight.delete(key);
      }
    })();
  }

  private isCurrent(key: string, requestId: number): boolean {
    return this.requestIds.get(key) === requestId;
  }

  private write(key: string, next: CacheEntry): void {
    const previous = this.getEntry(key);
    if (
      Object.is(previous.value, next.value) &&
      previous.hasValue === next.hasValue &&
      previous.error === next.error
    ) {
      return;
    }

    this.entries.set(key, next);
    const keyListeners = this.listeners.get(key);
    if (!keyListeners) return;
    for (const listener of [...keyListeners]) listener();
  }
}
