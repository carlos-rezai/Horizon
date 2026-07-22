// @vitest-environment jsdom
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { useReducedMotion } from "./useReducedMotion";

// The seam the transitions criteria are asserted at: everything downstream
// (the fade wrappers, the eased expands) reads motion through this hook, so
// proving the hook honours the preference proves the app does.
const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";

interface MediaStub {
  /** Flip the system preference the way an OS settings change would. */
  setMatches: (value: boolean) => void;
  /** How many change listeners are still attached. */
  listenerCount: () => number;
  /** Every query string the hook has asked matchMedia for. */
  queries: string[];
}

/** jsdom ships no matchMedia, so the preference is stubbed at the window. */
function stubMatchMedia(initialMatches: boolean): MediaStub {
  const queries: string[] = [];
  const listeners = new Set<(event: MediaQueryListEvent) => void>();
  let matches = initialMatches;

  const list = {
    get matches() {
      return matches;
    },
    media: REDUCE_QUERY,
    addEventListener(_type: string, fn: (event: MediaQueryListEvent) => void) {
      listeners.add(fn);
    },
    removeEventListener(
      _type: string,
      fn: (event: MediaQueryListEvent) => void
    ) {
      listeners.delete(fn);
    },
  };

  vi.stubGlobal("matchMedia", (query: string) => {
    queries.push(query);
    return list as unknown as MediaQueryList;
  });

  return {
    setMatches(value: boolean) {
      matches = value;
      listeners.forEach((fn) =>
        fn({ matches: value } as unknown as MediaQueryListEvent)
      );
    },
    listenerCount: () => listeners.size,
    queries,
  };
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("useReducedMotion", () => {
  it("reports no preference when the reduce query does not match", () => {
    stubMatchMedia(false);

    const { result } = renderHook(() => useReducedMotion());

    expect(result.current).toBe(false);
  });

  it("reports a preference when the reduce query matches", () => {
    stubMatchMedia(true);

    const { result } = renderHook(() => useReducedMotion());

    expect(result.current).toBe(true);
  });

  it("asks for the prefers-reduced-motion: reduce query", () => {
    const media = stubMatchMedia(false);

    renderHook(() => useReducedMotion());

    expect(media.queries).toContain(REDUCE_QUERY);
  });

  it("follows the preference when it changes while mounted", () => {
    const media = stubMatchMedia(false);

    const { result } = renderHook(() => useReducedMotion());
    expect(result.current).toBe(false);

    act(() => media.setMatches(true));

    expect(result.current).toBe(true);
  });

  it("stops listening once unmounted", () => {
    const media = stubMatchMedia(false);

    const { unmount } = renderHook(() => useReducedMotion());
    unmount();

    expect(media.listenerCount()).toBe(0);
  });

  it("reports no preference when matchMedia is unavailable", () => {
    vi.stubGlobal("matchMedia", undefined);

    const { result } = renderHook(() => useReducedMotion());

    expect(result.current).toBe(false);
  });
});
