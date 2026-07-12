import { useEffect, useState } from "react";
import {
  deriveDefaultVisibility,
  isolateSeries,
  loadVisibility,
  saveVisibility,
  showAllSeries,
  toggleSeries,
  type SeriesVisibility,
  type VisibilityAccount,
} from "../utils/trajectory/trajectory";

export interface UseSeriesVisibilityResult {
  /** The current per-series on/off map. */
  visibility: SeriesVisibility;
  /** How many of `seriesKeys` are currently visible. */
  visibleCount: number;
  /** Flip a single series. */
  toggle: (key: string) => void;
  /** Show only the chosen series, hide every other. */
  isolate: (key: string) => void;
  /** Show every series. */
  showAll: () => void;
}

/**
 * Owns a chart's series-visibility state: seeds defaults from the accounts once
 * at mount, merges any persisted map on top, and writes changes back to
 * `localStorage` under `storageKey`. Shared by the Dashboard's Trajectory
 * Horizon and the History chart, which keep independent state under different
 * keys. The pure state transitions live in `utils/trajectory`; this hook only
 * binds them to React state and persistence.
 */
export function useSeriesVisibility(
  accounts: VisibilityAccount[],
  seriesKeys: string[],
  storageKey: string
): UseSeriesVisibilityResult {
  const [visibility, setVisibility] = useState<SeriesVisibility>(() => {
    const defaults = deriveDefaultVisibility(accounts);
    const persisted =
      typeof window !== "undefined"
        ? loadVisibility(window.localStorage, storageKey)
        : null;
    return persisted ? { ...defaults, ...persisted } : defaults;
  });

  useEffect(() => {
    if (typeof window !== "undefined") {
      saveVisibility(window.localStorage, storageKey, visibility);
    }
  }, [storageKey, visibility]);

  return {
    visibility,
    visibleCount: seriesKeys.filter((key) => visibility[key] === true).length,
    toggle: (key) => setVisibility((current) => toggleSeries(current, key)),
    isolate: (key) => setVisibility(isolateSeries(seriesKeys, key)),
    showAll: () => setVisibility(showAllSeries(seriesKeys)),
  };
}
