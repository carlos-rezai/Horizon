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
