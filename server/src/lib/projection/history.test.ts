import { describe, expect, it } from "vitest";
import { deriveHistory } from "./history.js";
import type { MonthlySnapshot } from "./projection.js";
import type { AccountKind } from "../../storage/types.js";
import { computeYearComparison } from "../yearComparison/yearComparison.js";

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
      monthlySavings: null,
      monthlySpending: null,
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

// ---------------------------------------------------------------------------
// Monthly Savings (Financial History, issue #243) — the sum of the
// month-over-month gains of the Trackable Accounts (Girokonto, Tagesgeld,
// Investment). Null when any Trackable Account is Unknown that month or the
// month before, and in the span's first month.
// ---------------------------------------------------------------------------

/**
 * A snapshot with explicit `actual` balances per account. An account left out
 * of `actuals` is Unknown that month (no `actual`).
 */
function snapshotWith(
  month: string,
  actuals: Record<string, number>
): MonthlySnapshot {
  const snapAccounts: MonthlySnapshot["accounts"] = {};
  for (const a of accounts) {
    const actual = actuals[a.id];
    snapAccounts[a.id] =
      actual === undefined ? { projected: 0 } : { projected: actual, actual };
  }
  return { month, accounts: snapAccounts, netCashflow: 0, totalLiquid: 0 };
}

describe("deriveHistory - monthlySavings", () => {
  const base = { g1: 100000, t1: 50000, i1: 20000, m1: 30000000 };

  it("is null in the first month of the span", () => {
    const points = deriveHistory(
      [snapshotWith("2025-01", base), snapshotWith("2025-02", base)],
      [],
      accounts
    );

    expect(points[0].monthlySavings).toBeNull();
  });

  it("sums the month-over-month gains of the Trackable Accounts", () => {
    const points = deriveHistory(
      [
        snapshotWith("2025-01", base),
        snapshotWith("2025-02", { ...base, g1: 103000, t1: 52000 }),
      ],
      [],
      accounts
    );

    // +3000 (giro) + 2000 (tagesgeld)
    expect(points[1].monthlySavings).toBe(5000);
  });

  it("nets a Recurring Transfer between two Trackable Accounts to zero", () => {
    const transactions = [
      { accountId: "g1", date: "2025-02-01", amount: -10000 },
      { accountId: "t1", date: "2025-02-01", amount: 10000 },
    ];
    const points = deriveHistory(
      [
        snapshotWith("2025-01", base),
        snapshotWith("2025-02", { ...base, g1: 90000, t1: 60000 }),
      ],
      transactions,
      accounts
    );

    expect(points[1].monthlySavings).toBe(0);
  });

  it("counts a Sondertilgung paid out of the Trackable Accounts as negative", () => {
    // 500000 leaves the Girokonto and pays down the mortgage; the mortgage's
    // movement is not a Trackable Account gain.
    const transactions = [
      { accountId: "g1", date: "2025-11-01", amount: -500000 },
      { accountId: "m1", date: "2025-11-01", amount: 500000 },
    ];
    const points = deriveHistory(
      [
        snapshotWith("2025-10", { ...base, g1: 600000 }),
        snapshotWith("2025-11", { ...base, g1: 100000, m1: 29500000 }),
      ],
      transactions,
      accounts
    );

    expect(points[1].monthlySavings).toBe(-500000);
  });

  it("is null when a Trackable Account is Unknown that month", () => {
    const { t1: _t1, ...withoutTagesgeld } = base;
    const points = deriveHistory(
      [
        snapshotWith("2025-01", base),
        snapshotWith("2025-02", withoutTagesgeld),
      ],
      [],
      accounts
    );

    expect(points[1].monthlySavings).toBeNull();
  });

  it("is null when a Trackable Account is Unknown the month before", () => {
    const { i1: _i1, ...withoutInvestment } = base;
    const points = deriveHistory(
      [
        snapshotWith("2025-01", withoutInvestment),
        snapshotWith("2025-02", base),
        snapshotWith("2025-03", { ...base, g1: 101000 }),
      ],
      [],
      accounts
    );

    expect(points[1].monthlySavings).toBeNull();
    // Known both months from here on: a real figure again.
    expect(points[2].monthlySavings).toBe(1000);
  });

  it("counts a Trackable Account that has no savings target", () => {
    // Only the Investment account moves; it carries no target, and its gain
    // is still the month's saving.
    const points = deriveHistory(
      [
        snapshotWith("2025-01", base),
        snapshotWith("2025-02", { ...base, i1: 27000 }),
      ],
      [],
      accounts
    );

    expect(points[1].monthlySavings).toBe(7000);
  });
});

// ---------------------------------------------------------------------------
// Monthly Spending (Financial History, issue #244) — the magnitude of the
// month's Variable Spending outflows on the spending accounts, through the
// shared Variable Spending lib behind Month Year-Comparison. Null when no
// spending account is known that month; a real 0 in a known month with none.
// ---------------------------------------------------------------------------

describe("deriveHistory - monthlySpending", () => {
  const base = { g1: 100000, t1: 50000, i1: 20000, m1: 30000000 };

  /**
   * One fixture both rules read: Variable Spending on the Girokonto and the
   * Tagesgeld across three months, plus movements neither rule may count — a
   * transfer leg pair, a credit-card auto-settlement, and transactions on the
   * Mortgage and the Investment account.
   */
  const shared = [
    { accountId: "g1", date: "2025-01-05", amount: -4000, category: "Food" },
    {
      accountId: "g1",
      date: "2025-01-20",
      amount: -1500,
      category: "Transport",
    },
    { accountId: "t1", date: "2025-01-22", amount: -700, category: "Food" },
    {
      accountId: "g1",
      date: "2025-01-28",
      amount: -20000,
      category: "Transfer",
      transferId: "tr1",
    },
    {
      accountId: "t1",
      date: "2025-01-28",
      amount: 20000,
      category: "Transfer",
      transferId: "tr1",
    },
    {
      accountId: "g1",
      date: "2025-02-03",
      amount: -2500,
      category: "Entertainment",
    },
    {
      accountId: "g1",
      date: "2025-02-28",
      amount: -9000,
      category: "Settlement",
      isAutoSettlement: true,
    },
    {
      accountId: "m1",
      date: "2025-02-15",
      amount: -80000,
      category: "Housing",
    },
    { accountId: "i1", date: "2025-02-15", amount: -5000, category: "Food" },
    { accountId: "g1", date: "2025-03-10", amount: -3300, category: "Food" },
    { accountId: "t1", date: "2025-03-11", amount: -1200, category: "Health" },
  ];

  const sharedSnapshots = [
    snapshotWith("2025-01", base),
    snapshotWith("2025-02", base),
    snapshotWith("2025-03", base),
  ];

  it("is the magnitude of the month's Variable Spending outflows on the spending accounts", () => {
    const points = deriveHistory(sharedSnapshots, shared, accounts);

    // Jan: 4000 + 1500 + 700; the transfer legs are not spending.
    expect(points[0].monthlySpending).toBe(6200);
    // Feb: 2500; auto-settlement, Mortgage and Investment are excluded.
    expect(points[1].monthlySpending).toBe(2500);
    // Mar: 3300 + 1200
    expect(points[2].monthlySpending).toBe(4500);
  });

  it("agrees with the Month Year-Comparison rule on the same fixture", () => {
    const points = deriveHistory(sharedSnapshots, shared, accounts);

    for (const viewedMonth of ["2025-01", "2025-02", "2025-03"]) {
      const yearComparisonTotal = computeYearComparison(
        shared,
        accounts,
        viewedMonth
      ).reduce((sum, row) => sum + row.thisYear, 0);
      const historyTotal = points
        .filter((p) => p.month <= viewedMonth)
        .reduce((sum, p) => sum + (p.monthlySpending ?? 0), 0);

      expect(historyTotal).toBe(yearComparisonTotal);
    }
  });

  it("is null before any spending account is known", () => {
    // Only the Mortgage and the Investment account are known in January.
    const noSpendingAccounts = { i1: base.i1, m1: base.m1 };
    const points = deriveHistory(
      [
        snapshotWith("2025-01", noSpendingAccounts),
        snapshotWith("2025-02", base),
      ],
      [],
      accounts
    );

    expect(points[0].monthlySpending).toBeNull();
    expect(points[1].monthlySpending).toBe(0);
  });

  it("is a number once one spending account is known that month", () => {
    const girokontoOnly = { g1: base.g1, i1: base.i1, m1: base.m1 };
    const transactions = [
      { accountId: "g1", date: "2025-01-09", amount: -1800, category: "Food" },
    ];
    const points = deriveHistory(
      [snapshotWith("2025-01", girokontoOnly)],
      transactions,
      accounts
    );

    expect(points[0].monthlySpending).toBe(1800);
  });

  it("is a real 0 in a known month with no spending", () => {
    const transactions = [
      {
        accountId: "g1",
        date: "2025-01-28",
        amount: -20000,
        category: "Transfer",
        transferId: "tr1",
      },
      {
        accountId: "t1",
        date: "2025-01-28",
        amount: 20000,
        category: "Transfer",
        transferId: "tr1",
      },
    ];
    const points = deriveHistory(
      [snapshotWith("2025-01", base), snapshotWith("2025-02", base)],
      transactions,
      accounts
    );

    expect(points[0].monthlySpending).toBe(0);
    expect(points[1].monthlySpending).toBe(0);
  });
});
