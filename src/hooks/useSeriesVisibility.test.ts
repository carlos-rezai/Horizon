// @vitest-environment jsdom
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { useSeriesVisibility } from "./useSeriesVisibility";
import type { VisibilityAccount } from "../utils/trajectory/trajectory";

const KEY = "horizon.test.visibility";

// A shown Girokonto, a hidden Tagesgeld, and a Mortgage (represented by the
// Restschuld series, never its own line).
const ACCOUNTS: VisibilityAccount[] = [
  { id: "giro", kind: "Girokonto", showInTrajectory: true },
  { id: "tages", kind: "Tagesgeld", showInTrajectory: false },
  { id: "mtg", kind: "Mortgage", showInTrajectory: true },
];

const SERIES_KEYS = ["totalLiquid", "giro", "tages", "restschuld"];

afterEach(() => {
  window.localStorage.clear();
});

describe("useSeriesVisibility", () => {
  it("seeds defaults from accounts when nothing is persisted", () => {
    const { result } = renderHook(() =>
      useSeriesVisibility(ACCOUNTS, SERIES_KEYS, KEY)
    );

    expect(result.current.visibility).toEqual({
      giro: true,
      tages: false,
      restschuld: true,
      totalLiquid: false,
    });
  });

  it("counts only the visible series among the given keys", () => {
    const { result } = renderHook(() =>
      useSeriesVisibility(ACCOUNTS, SERIES_KEYS, KEY)
    );

    // giro + restschuld visible; tages + totalLiquid hidden.
    expect(result.current.visibleCount).toBe(2);
  });

  it("merges a persisted map on top of the derived defaults", () => {
    window.localStorage.setItem(KEY, '{"totalLiquid":true,"giro":false}');

    const { result } = renderHook(() =>
      useSeriesVisibility(ACCOUNTS, SERIES_KEYS, KEY)
    );

    expect(result.current.visibility).toEqual({
      giro: false, // overridden by persisted
      tages: false, // from defaults
      restschuld: true, // from defaults
      totalLiquid: true, // overridden by persisted
    });
  });

  it("toggle flips a single series and leaves the rest untouched", () => {
    const { result } = renderHook(() =>
      useSeriesVisibility(ACCOUNTS, SERIES_KEYS, KEY)
    );

    act(() => result.current.toggle("totalLiquid"));

    expect(result.current.visibility.totalLiquid).toBe(true);
    expect(result.current.visibility.giro).toBe(true);
    expect(result.current.visibility.tages).toBe(false);
  });

  it("isolate shows only the target series", () => {
    const { result } = renderHook(() =>
      useSeriesVisibility(ACCOUNTS, SERIES_KEYS, KEY)
    );

    act(() => result.current.isolate("giro"));

    expect(result.current.visibility).toEqual({
      totalLiquid: false,
      giro: true,
      tages: false,
      restschuld: false,
    });
  });

  it("showAll turns on every series", () => {
    const { result } = renderHook(() =>
      useSeriesVisibility(ACCOUNTS, SERIES_KEYS, KEY)
    );

    act(() => result.current.showAll());

    expect(result.current.visibility).toEqual({
      totalLiquid: true,
      giro: true,
      tages: true,
      restschuld: true,
    });
  });

  it("persists the visibility map to localStorage on change", () => {
    const { result } = renderHook(() =>
      useSeriesVisibility(ACCOUNTS, SERIES_KEYS, KEY)
    );

    act(() => result.current.toggle("totalLiquid"));

    const persisted = JSON.parse(window.localStorage.getItem(KEY) ?? "{}");
    expect(persisted.totalLiquid).toBe(true);
  });
});
