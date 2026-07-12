import type { AccountKind } from "../../types/account";
import { resolveAccountColor } from "../color/color";

/**
 * Maps a series key (per-account id, "restschuld", or "totalLiquid") to whether
 * its line is currently rendered in the Trajectory Horizon chart.
 */
export type SeriesVisibility = Record<string, boolean>;

/**
 * The minimal shape `computeVisibleYDomain` needs from a chart data point: a
 * keyed bag of cell values. Both the Dashboard's `TrajectoryDataPoint` and the
 * History chart's own row shape satisfy it structurally, so the domain math is
 * shared without either caller casting.
 */
export type ChartRow = Record<string, number | string | boolean | null>;

/** The minimal account shape needed to derive default series visibility. */
export interface VisibilityAccount {
  id: string;
  kind: AccountKind;
  showInTrajectory: boolean;
}

/** Storage abstraction so persistence can be tested without a real DOM. */
export interface VisibilityStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

/** Y-axis ticks step in cents (€25,000) — the chart rounds its domain to this. */
const TICK_STEP = 2_500_000;

const RESTSCHULD_KEY = "restschuld";
const TOTAL_LIQUID_KEY = "totalLiquid";

/**
 * A single legend/line entry: the Total Liquid (SUM) series, a per-account
 * series, or the Restschuld (debt) series. Shared by the Trajectory Horizon
 * and History charts so their legends and lines agree on order and identity.
 */
export interface SeriesDescriptor {
  key: string;
  name: string;
  color: string;
  kind: "liquid" | "account" | "debt";
  dashed: boolean;
}

/** The two theme colours the descriptor list needs beyond per-account colours. */
export interface SeriesColors {
  liquid: string;
  restschuld: string;
}

/** The minimal account shape needed to build a per-account series descriptor. */
export interface SeriesAccount {
  id: string;
  name: string;
  color?: string | null;
  kind: AccountKind;
}

/**
 * Build the ordered series list a chart renders: the gold Total Liquid (SUM)
 * series first, then one series per non-Mortgage account (in the given order),
 * then the dashed Restschuld series when a Mortgage exists. Per-account colours
 * resolve through `resolveAccountColor`; the liquid and Restschuld colours are
 * passed in so this stays React-free.
 */
export function buildSeriesDescriptors(
  nonMortgageAccounts: SeriesAccount[],
  hasMortgage: boolean,
  colors: SeriesColors
): SeriesDescriptor[] {
  const descriptors: SeriesDescriptor[] = [
    {
      key: TOTAL_LIQUID_KEY,
      name: "Total Liquid",
      color: colors.liquid,
      kind: "liquid",
      dashed: false,
    },
    ...nonMortgageAccounts.map<SeriesDescriptor>((account) => ({
      key: account.id,
      name: account.name,
      color: resolveAccountColor(account),
      kind: "account",
      dashed: false,
    })),
  ];

  if (hasMortgage) {
    descriptors.push({
      key: RESTSCHULD_KEY,
      name: "Restschuld",
      color: colors.restschuld,
      kind: "debt",
      dashed: true,
    });
  }

  return descriptors;
}

/**
 * Default visibility: each non-Mortgage account follows its own
 * showInTrajectory flag, the Restschuld series is on (only when a Mortgage
 * exists), and the Total Liquid (SUM) series is off. Mortgage accounts never
 * get their own per-account series — they are represented by Restschuld.
 */
export function deriveDefaultVisibility(
  accounts: VisibilityAccount[]
): SeriesVisibility {
  const visibility: SeriesVisibility = {};
  let hasMortgage = false;

  for (const account of accounts) {
    if (account.kind === "Mortgage") {
      hasMortgage = true;
      continue;
    }
    visibility[account.id] = account.showInTrajectory;
  }

  if (hasMortgage) {
    visibility[RESTSCHULD_KEY] = true;
  }
  visibility[TOTAL_LIQUID_KEY] = false;

  return visibility;
}

/** Flip a single series, leaving every other series untouched. */
export function toggleSeries(
  visibility: SeriesVisibility,
  key: string
): SeriesVisibility {
  return { ...visibility, [key]: !visibility[key] };
}

/** Show only the chosen series and hide every other series. */
export function isolateSeries(
  keys: string[],
  target: string
): SeriesVisibility {
  const visibility: SeriesVisibility = {};
  for (const key of keys) {
    visibility[key] = key === target;
  }
  return visibility;
}

/** Show every series. */
export function showAllSeries(keys: string[]): SeriesVisibility {
  const visibility: SeriesVisibility = {};
  for (const key of keys) {
    visibility[key] = true;
  }
  return visibility;
}

/**
 * Compute the Y-axis domain from the visible series only, so hidden lines drop
 * out and the remaining lines rescale. The domain rounds up to the next tick
 * step, falling back to a single step when nothing visible has a value.
 */
export function computeVisibleYDomain(
  data: ChartRow[],
  visibility: SeriesVisibility
): [number, number] {
  let max = 0;
  for (const point of data) {
    for (const [key, visible] of Object.entries(visibility)) {
      if (!visible) continue;
      const value = point[key];
      if (typeof value === "number" && value > max) {
        max = value;
      }
    }
  }

  const steps = Math.max(1, Math.ceil(max / TICK_STEP));
  return [0, steps * TICK_STEP];
}

/** Load a persisted visibility map, returning null when absent or malformed. */
export function loadVisibility(
  store: VisibilityStore,
  key: string
): SeriesVisibility | null {
  const raw = store.getItem(key);
  if (raw === null) return null;
  try {
    return JSON.parse(raw) as SeriesVisibility;
  } catch {
    return null;
  }
}

/** Persist a visibility map. */
export function saveVisibility(
  store: VisibilityStore,
  key: string,
  visibility: SeriesVisibility
): void {
  store.setItem(key, JSON.stringify(visibility));
}
