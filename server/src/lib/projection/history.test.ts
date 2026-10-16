import { describe, expect, it } from "vitest";
import { deriveHistory } from "./history.js";
import type { MonthlySnapshot } from "./projection.js";
import type { AccountKind } from "../../storage/types.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const accounts: { id: string; kind: AccountKind }[] = [
  { id: "g1", kind: "Girokonto" },
  { id: "t1", kind: "Tagesgeld" },
  { id: "m1", kind: "Mortgage" },
  { id: "i1", kind: "Investment" },
];

/**
 * A single snapshot with distinct actual vs projected values per account, so
 * the tests can prove which figure each HistoryPoint field reads from.
 */
function snapshot(month: string): MonthlySnapshot {
  return {
    month,
    accounts: {
      g1: { projected: 999999, actual: 50000 },
      t1: { projected: 888888, actual: 30000 },
      // A mortgage's actual is its flat un-replayed opening balance; the
      // replayed principal lives in projected.
      m1: { projected: 200000, actual: 300000 },
      i1: { projected: 777777, actual: 10000 },
    },
    // Deliberately not -1 * anything the history should report: the recurring/
    // projected netCashflow the snapshot carries must be ignored.
    netCashflow: 424242,
    totalLiquid: 999999,
  };
}

// ---------------------------------------------------------------------------
// deriveHistory
// ---------------------------------------------------------------------------

describe("deriveHistory - shape", () => {
  it("returns one HistoryPoint per snapshot, month passed through", () => {
    const snapshots = [snapshot("2025-01"), snapshot("2025-02")];
    const points = deriveHistory(snapshots, [], accounts);

    expect(points).toHaveLength(2);
    expect(points[0].month).toBe("2025-01");
    expect(points[1].month).toBe("2025-02");
  });

  it("returns [] when there are no snapshots", () => {
    expect(deriveHistory([], [], accounts)).toEqual([]);
  });
});

describe("deriveHistory - per-account actuals", () => {
  it("maps each account id to its snapshot actual balance", () => {
    const points = deriveHistory([snapshot("2025-01")], [], accounts);

    expect(points[0].accounts).toEqual({
      g1: 50000,
      t1: 30000,
      m1: 300000,
      i1: 10000,
    });
  });
});

describe("deriveHistory - totalLiquid", () => {
  it("sums only Girokonto and Tagesgeld actual balances", () => {
    const points = deriveHistory([snapshot("2025-01")], [], accounts);

    // 50000 (giro) + 30000 (tagesgeld) — excludes mortgage and investment
    expect(points[0].totalLiquid).toBe(80000);
  });
});

describe("deriveHistory - restschuld", () => {
  it("uses the mortgage's projected balance, not its flat actual", () => {
    const points = deriveHistory([snapshot("2025-01")], [], accounts);

    expect(points[0].restschuld).toBe(200000);
  });

  it("is 0 when there is no mortgage account", () => {
    const liquidOnly: { id: string; kind: AccountKind }[] = [
      { id: "g1", kind: "Girokonto" },
    ];
    const snap: MonthlySnapshot = {
      month: "2025-01",
      accounts: { g1: { projected: 111, actual: 222 } },
      netCashflow: 0,
      totalLiquid: 0,
    };

    const points = deriveHistory([snap], [], liquidOnly);
    expect(points[0].restschuld).toBe(0);
  });
});

describe("deriveHistory - netCashflow", () => {
  it("sums the real stored transactions in the month, not the snapshot figure", () => {
    const transactions = [
      { accountId: "g1", date: "2025-01-05", amount: -1000 },
      { accountId: "g1", date: "2025-01-20", amount: -2000 },
      { accountId: "t1", date: "2025-01-10", amount: 500 },
      // A different month — must not leak into January's netCashflow.
      { accountId: "g1", date: "2025-02-01", amount: -9999 },
    ];

    const points = deriveHistory(
      [snapshot("2025-01"), snapshot("2025-02")],
      transactions,
      accounts
    );

    // -1000 - 2000 + 500 = -2500 (ignores snapshot.netCashflow of 424242)
    expect(points[0].netCashflow).toBe(-2500);
    expect(points[1].netCashflow).toBe(-9999);
  });

  it("is 0 for a month with no stored transactions", () => {
    const points = deriveHistory([snapshot("2025-01")], [], accounts);
    expect(points[0].netCashflow).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Unknown months (Balance Anchor, issue #235)
// ---------------------------------------------------------------------------

/**
 * A snapshot in which only the listed accounts carry an `actual` — the engine
 * omits `actual` for an account in a month before its Known Since.
 */
function snapshotKnowing(month: string, known: string[]): MonthlySnapshot {
  const all: Record<string, { projected: number; actual: number }> = {
    g1: { projected: 999999, actual: 50000 },
    t1: { projected: 888888, actual: 30000 },
    m1: { projected: 200000, actual: 300000 },
    i1: { projected: 777777, actual: 10000 },
  };
  const snapAccounts: MonthlySnapshot["accounts"] = {};
  for (const [id, values] of Object.entries(all)) {
    snapAccounts[id] = known.includes(id)
      ? values
      : { projected: values.projected };
  }
  return { month, accounts: snapAccounts, netCashflow: 0, totalLiquid: 0 };
}

describe("deriveHistory - Unknown months", () => {
  it("carries an explicit null for an account before its Known Since, never 0 or an omitted key", () => {
    const points = deriveHistory(
      [snapshotKnowing("2025-01", ["g1", "t1", "m1"])],
      [],
      accounts
    );

    expect(Object.keys(points[0].accounts)).toContain("i1");
    expect(points[0].accounts.i1).toBeNull();
    expect(points[0].accounts.g1).toBe(50000);
  });

  it("sums a partial Total Liquid from the liquid accounts known that month", () => {
    const points = deriveHistory(
      [snapshotKnowing("2025-01", ["g1", "m1", "i1"])],
      [],
      accounts
    );

    // Tagesgeld is Unknown: Total Liquid is the Girokonto alone, and the
    // Tagesgeld stays null rather than counting as a 0 balance.
    expect(points[0].accounts.t1).toBeNull();
    expect(points[0].totalLiquid).toBe(50000);
  });

  it("is null for Total Liquid when no liquid account is known that month", () => {
    const points = deriveHistory(
      [snapshotKnowing("2025-01", ["m1", "i1"])],
      [],
      accounts
    );

    expect(points[0].totalLiquid).toBeNull();
  });

  it("is null for the Restschuld before the Mortgage's Known Since", () => {
    const points = deriveHistory(
      [snapshotKnowing("2025-01", ["g1", "t1", "i1"])],
      [],
      accounts
    );

    expect(points[0].restschuld).toBeNull();
  });

  it("reads null everywhere in an all-Unknown month, while netCashflow stays a number", () => {
    const points = deriveHistory(
      [snapshotKnowing("2025-01", [])],
      [],
      accounts
    );

    expect(points[0]).toEqual({
      month: "2025-01",
      totalLiquid: null,
      restschuld: null,
      netCashflow: 0,
      restschuldBridge: null,
      accounts: { g1: null, t1: null, m1: null, i1: null },
    });
  });
});

// ---------------------------------------------------------------------------
// Paydown Bridge (Financial History, issue #240) — a straight line in cents
// from the Original Principal in the Mortgage Start month to the Restschuld in
// the Mortgage's first known month. It never writes into `restschuld`.
// ---------------------------------------------------------------------------

describe("deriveHistory - restschuldBridge", () => {
  // Mortgage Start 2025-01, Original Principal 500000. The mortgage is Known
  // Since 2025-04, where its replayed Restschuld is 200000: three monthly steps
  // of 100000 each.
  const originatedAccounts = [
    { id: "g1", kind: "Girokonto" as AccountKind },
    {
      id: "m1",
      kind: "Mortgage" as AccountKind,
      originalPrincipal: 500000,
      startDate: "2025-01-15",
    },
  ];

  const bridgeSnapshots = [
    snapshotKnowing("2024-12", ["g1"]),
    snapshotKnowing("2025-01", ["g1"]),
    snapshotKnowing("2025-02", ["g1"]),
    snapshotKnowing("2025-03", ["g1"]),
    snapshotKnowing("2025-04", ["g1", "m1"]),
    snapshotKnowing("2025-05", ["g1", "m1"]),
  ];

  function bridge(accountList: Parameters<typeof deriveHistory>[2]) {
    return deriveHistory(bridgeSnapshots, [], accountList).map(
      (p) => p.restschuldBridge
    );
  }

  it("starts at the Original Principal in the Mortgage Start month and ends at the first known Restschuld", () => {
    const points = deriveHistory(bridgeSnapshots, [], originatedAccounts);

    expect(points[1].restschuldBridge).toBe(500000);
    expect(points[4].restschuldBridge).toBe(200000);
  });

  it("runs linearly between its start and end, in integer cents", () => {
    const points = deriveHistory(bridgeSnapshots, [], originatedAccounts);

    expect(points[2].restschuldBridge).toBe(400000);
    expect(points[3].restschuldBridge).toBe(300000);
  });

  it("equals the Restschuld in the month where they join", () => {
    const points = deriveHistory(bridgeSnapshots, [], originatedAccounts);

    expect(points[4].restschuld).toBe(200000);
    expect(points[4].restschuldBridge).toBe(points[4].restschuld);
  });

  it("is null before the Mortgage Start month and after the first known month", () => {
    const points = deriveHistory(bridgeSnapshots, [], originatedAccounts);

    expect(points[0].restschuldBridge).toBeNull();
    expect(points[5].restschuldBridge).toBeNull();
  });

  it("keeps the Restschuld null under the bridge", () => {
    const points = deriveHistory(bridgeSnapshots, [], originatedAccounts);

    for (const i of [1, 2, 3]) {
      expect(points[i].restschuldBridge).toEqual(expect.any(Number));
      expect(points[i].restschuld).toBeNull();
    }
  });

  it("is null in every month when there is no Mortgage", () => {
    expect(bridge([{ id: "g1", kind: "Girokonto" }])).toEqual([
      null,
      null,
      null,
      null,
      null,
      null,
    ]);
  });

  it("is null in every month when the Mortgage has no origination", () => {
    expect(
      bridge([
        { id: "g1", kind: "Girokonto" },
        { id: "m1", kind: "Mortgage" },
      ])
    ).toEqual([null, null, null, null, null, null]);
  });

  it("is null in every month when the Mortgage Start month equals Known Since", () => {
    expect(
      bridge([
        { id: "g1", kind: "Girokonto" },
        {
          id: "m1",
          kind: "Mortgage",
          originalPrincipal: 500000,
          startDate: "2025-04-01",
        },
      ])
    ).toEqual([null, null, null, null, null, null]);
  });
});
