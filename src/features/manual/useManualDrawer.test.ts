// @vitest-environment jsdom
import { renderHook, act, fireEvent, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { useManualDrawer, MANUAL_TRANSITION_MS } from "./useManualDrawer";

const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";

/** jsdom ships no matchMedia; the preference is stubbed at the window. */
function stubReducedMotion(matches: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query === REDUCE_QUERY ? matches : false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

function pressEscape() {
  fireEvent.keyDown(document, { key: "Escape" });
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("useManualDrawer — opening and closing", () => {
  it("starts closed with nothing mounted, so launching Horizon never puts an overlay in the way", () => {
    stubReducedMotion(false);

    const { result } = renderHook(() => useManualDrawer());

    expect(result.current.isOpen).toBe(false);
    expect(result.current.isMounted).toBe(false);
  });

  it("opens and mounts the drawer when asked", () => {
    stubReducedMotion(false);

    const { result } = renderHook(() => useManualDrawer());
    act(() => result.current.open());

    expect(result.current.isOpen).toBe(true);
    expect(result.current.isMounted).toBe(true);
  });

  it("opening an already-open drawer leaves it open", () => {
    stubReducedMotion(false);

    const { result } = renderHook(() => useManualDrawer());
    act(() => result.current.open());
    act(() => result.current.open());

    expect(result.current.isOpen).toBe(true);
    expect(result.current.isMounted).toBe(true);
  });

  it("closes immediately but stays mounted while the exit transition runs", () => {
    stubReducedMotion(false);
    vi.useFakeTimers();

    const { result } = renderHook(() => useManualDrawer());
    act(() => result.current.open());
    act(() => result.current.close());

    expect(result.current.isOpen).toBe(false);
    expect(result.current.isMounted).toBe(true);
  });

  it("stays mounted for the full transition duration", () => {
    stubReducedMotion(false);
    vi.useFakeTimers();

    const { result } = renderHook(() => useManualDrawer());
    act(() => result.current.open());
    act(() => result.current.close());
    act(() => {
      vi.advanceTimersByTime(MANUAL_TRANSITION_MS - 1);
    });

    expect(result.current.isMounted).toBe(true);
  });

  it("unmounts once the exit transition has finished", () => {
    stubReducedMotion(false);
    vi.useFakeTimers();

    const { result } = renderHook(() => useManualDrawer());
    act(() => result.current.open());
    act(() => result.current.close());
    act(() => {
      vi.advanceTimersByTime(MANUAL_TRANSITION_MS);
    });

    expect(result.current.isOpen).toBe(false);
    expect(result.current.isMounted).toBe(false);
  });

  it("reopening mid-exit cancels the pending unmount", () => {
    stubReducedMotion(false);
    vi.useFakeTimers();

    const { result } = renderHook(() => useManualDrawer());
    act(() => result.current.open());
    act(() => result.current.close());
    act(() => {
      vi.advanceTimersByTime(Math.floor(MANUAL_TRANSITION_MS / 2));
    });
    act(() => result.current.open());
    act(() => {
      vi.advanceTimersByTime(MANUAL_TRANSITION_MS);
    });

    // The drawer the reader just reopened must not vanish when the earlier
    // close's timer fires.
    expect(result.current.isOpen).toBe(true);
    expect(result.current.isMounted).toBe(true);
  });
});

describe("useManualDrawer — ESC", () => {
  it("closes an open drawer", () => {
    stubReducedMotion(false);
    vi.useFakeTimers();

    const { result } = renderHook(() => useManualDrawer());
    act(() => result.current.open());
    act(() => pressEscape());

    expect(result.current.isOpen).toBe(false);
  });

  it("unmounts the drawer it closed once the transition has run", () => {
    stubReducedMotion(false);
    vi.useFakeTimers();

    const { result } = renderHook(() => useManualDrawer());
    act(() => result.current.open());
    act(() => pressEscape());
    act(() => {
      vi.advanceTimersByTime(MANUAL_TRANSITION_MS);
    });

    expect(result.current.isMounted).toBe(false);
  });

  it("does nothing when the drawer is already closed", () => {
    stubReducedMotion(false);

    const { result } = renderHook(() => useManualDrawer());
    act(() => pressEscape());

    expect(result.current.isOpen).toBe(false);
    expect(result.current.isMounted).toBe(false);
  });

  it("ignores other keys while the drawer is open", () => {
    stubReducedMotion(false);

    const { result } = renderHook(() => useManualDrawer());
    act(() => result.current.open());
    act(() => {
      fireEvent.keyDown(document, { key: "Enter" });
    });

    expect(result.current.isOpen).toBe(true);
  });
});

describe("useManualDrawer — reduced motion", () => {
  it("opens and mounts the drawer the same way", () => {
    stubReducedMotion(true);

    const { result } = renderHook(() => useManualDrawer());
    act(() => result.current.open());

    expect(result.current.isOpen).toBe(true);
    expect(result.current.isMounted).toBe(true);
  });

  it("unmounts on close with no lingering mount, since there is no exit animation to wait for", () => {
    stubReducedMotion(true);
    vi.useFakeTimers();

    const { result } = renderHook(() => useManualDrawer());
    act(() => result.current.open());
    act(() => result.current.close());

    // No timers advanced: a reduced-motion reader is never left with an
    // invisible overlay mounted over the screen.
    expect(result.current.isOpen).toBe(false);
    expect(result.current.isMounted).toBe(false);
  });

  it("unmounts on ESC with no lingering mount", () => {
    stubReducedMotion(true);
    vi.useFakeTimers();

    const { result } = renderHook(() => useManualDrawer());
    act(() => result.current.open());
    act(() => pressEscape());

    expect(result.current.isMounted).toBe(false);
  });
});
