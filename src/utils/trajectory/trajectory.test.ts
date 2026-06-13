import { describe, it, expect } from "vitest";
import type { TrajectoryDataPoint } from "../../types/projection";
import {
  deriveDefaultVisibility,
  toggleSeries,
  isolateSeries,
  showAllSeries,
  computeVisibleYDomain,
  loadVisibility,
  saveVisibility,
  type SeriesVisibility,
  type VisibilityAccount,
  type VisibilityStore,
} from "./trajectory";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const ACCOUNTS: VisibilityAccount[] = [
  { id: "giro", kind: "Girokonto", showInTrajectory: true },
  { id: "tg", kind: "Tagesgeld", showInTrajectory: false },
  { id: "mort", kind: "Mortgage", showInTrajectory: true },
];

const DATA: TrajectoryDataPoint[] = [
  {
    monthIndex: 0,
    label: "2026-01",
    totalLiquid: 900000,
    restschuld: 4000000,
    isSTMonth: false,
    isPayoffMonth: false,
    giro: 500000,
    tg: 400000,
  },
  {
    monthIndex: 1,
    label: "2026-02",
    totalLiquid: 950000,
    restschuld: 3900000,
    isSTMonth: false,
    isPayoffMonth: false,
    giro: 520000,
    tg: 430000,
  },
];

function makeStore(): VisibilityStore {
  const map = new Map<string, string>();
  return {
    getItem: (key: string) => (map.has(key) ? (map.get(key) as string) : null),
    setItem: (key: string, value: string) => {
      map.set(key, value);
    },
  };
}

// ---------------------------------------------------------------------------
// deriveDefaultVisibility
// ---------------------------------------------------------------------------

describe("deriveDefaultVisibility", () => {
  it("makes each non-Mortgage account follow its own showInTrajectory flag", () => {
    const v = deriveDefaultVisibility(ACCOUNTS);
    expect(v["giro"]).toBe(true);
    expect(v["tg"]).toBe(false);
  });

  it("defaults the Restschuld series on and the Total Liquid (SUM) series off", () => {
    const v = deriveDefaultVisibility(ACCOUNTS);
    expect(v["restschuld"]).toBe(true);
    expect(v["totalLiquid"]).toBe(false);
  });

  it("does not add a Mortgage account as its own per-account series", () => {
    const v = deriveDefaultVisibility(ACCOUNTS);
    expect("mort" in v).toBe(false);
  });

  it("omits the Restschuld series entirely when there is no Mortgage account", () => {
    const v = deriveDefaultVisibility([
      { id: "giro", kind: "Girokonto", showInTrajectory: true },
    ]);
    expect("restschuld" in v).toBe(false);
    expect(v["totalLiquid"]).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// toggleSeries
// ---------------------------------------------------------------------------

describe("toggleSeries", () => {
  it("flips the requested series and leaves the rest untouched", () => {
    const input: SeriesVisibility = {
      giro: true,
      restschuld: true,
      totalLiquid: false,
    };
    const out = toggleSeries(input, "totalLiquid");
    expect(out["totalLiquid"]).toBe(true);
    expect(out["giro"]).toBe(true);
    expect(out["restschuld"]).toBe(true);
  });

  it("does not mutate the input map", () => {
    const input: SeriesVisibility = { giro: true, totalLiquid: false };
    toggleSeries(input, "giro");
    expect(input["giro"]).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// isolateSeries
// ---------------------------------------------------------------------------

describe("isolateSeries", () => {
  it("sets only the chosen series visible and every other series hidden", () => {
    const out = isolateSeries(
      ["giro", "tg", "restschuld", "totalLiquid"],
      "restschuld"
    );
    expect(out).toEqual({
      giro: false,
      tg: false,
      restschuld: true,
      totalLiquid: false,
    });
  });
});

// ---------------------------------------------------------------------------
// showAllSeries
// ---------------------------------------------------------------------------

describe("showAllSeries", () => {
  it("sets every series visible", () => {
    const out = showAllSeries(["giro", "restschuld", "totalLiquid"]);
    expect(out).toEqual({ giro: true, restschuld: true, totalLiquid: true });
  });
});

// ---------------------------------------------------------------------------
// computeVisibleYDomain — Y-axis rescales from visible-only series
// ---------------------------------------------------------------------------

describe("computeVisibleYDomain", () => {
  it("rounds the domain up to the next tick step from the max visible value", () => {
    const visibility: SeriesVisibility = {
      giro: true,
      tg: true,
      restschuld: true,
      totalLiquid: false,
    };
    // max visible = restschuld 4,000,000 → ceil to 5,000,000
    expect(computeVisibleYDomain(DATA, visibility)).toEqual([0, 5000000]);
  });

  it("drops a hidden series out of the domain so remaining lines rescale", () => {
    const visibility: SeriesVisibility = {
      giro: true,
      tg: true,
      restschuld: false,
      totalLiquid: false,
    };
    // restschuld hidden → max visible = giro 520,000 → ceil to 2,500,000
    expect(computeVisibleYDomain(DATA, visibility)).toEqual([0, 2500000]);
  });

  it("includes the Total Liquid series in the domain when it is visible", () => {
    const visibility: SeriesVisibility = {
      giro: false,
      tg: false,
      restschuld: false,
      totalLiquid: true,
    };
    // totalLiquid max 950,000 → ceil to 2,500,000
    expect(computeVisibleYDomain(DATA, visibility)).toEqual([0, 2500000]);
  });

  it("falls back to a single tick step when nothing is visible", () => {
    const allHidden: SeriesVisibility = {
      giro: false,
      tg: false,
      restschuld: false,
      totalLiquid: false,
    };
    expect(computeVisibleYDomain(DATA, allHidden)).toEqual([0, 2500000]);
  });
});

// ---------------------------------------------------------------------------
// Persistence — visibility survives a reload
// ---------------------------------------------------------------------------

describe("saveVisibility / loadVisibility", () => {
  const KEY = "horizon.trajectory.visibility.v2";

  it("round-trips a visibility map through the store", () => {
    const store = makeStore();
    const v: SeriesVisibility = {
      giro: false,
      restschuld: true,
      totalLiquid: true,
    };
    saveVisibility(store, KEY, v);
    expect(loadVisibility(store, KEY)).toEqual(v);
  });

  it("returns null when nothing is stored under the key", () => {
    expect(loadVisibility(makeStore(), KEY)).toBeNull();
  });

  it("returns null when the stored value is malformed JSON", () => {
    const store = makeStore();
    store.setItem(KEY, "{not valid json");
    expect(loadVisibility(store, KEY)).toBeNull();
  });
});
