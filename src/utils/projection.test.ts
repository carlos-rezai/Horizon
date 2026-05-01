import { describe, it, expect } from "vitest";
import {
  findMortgagePayoffMonth,
  findMilestoneMonth,
  buildAccountColumns,
  deriveSTMonths,
  deriveYearSummaries,
  buildTrajectoryData,
} from "./projection";
import type { MonthlySnapshot } from "../types/projection";
import type { AccountWithBalance } from "../types/account";
import type { RecurringTransaction } from "../types/recurring";

const snapshot = (
  month: string,
  accountId: string,
  projected: number
): MonthlySnapshot => ({
  month,
  accounts: { [accountId]: { projected } },
  netCashflow: 0,
  totalLiquid: 0,
});

describe("findMortgagePayoffMonth", () => {
  it("returns the first month where the projected balance reaches zero", () => {
    const id = "mortgage-1";
    const snapshots: MonthlySnapshot[] = [
      snapshot("2026-04", id, 400000),
      snapshot("2026-05", id, 200000),
      snapshot("2026-06", id, 0),
      snapshot("2026-07", id, -50000),
    ];

    expect(findMortgagePayoffMonth(snapshots, id)).toBe("2026-06");
  });

  it("returns the first month that crosses zero, not a later one", () => {
    const id = "mortgage-1";
    const snapshots: MonthlySnapshot[] = [
      snapshot("2026-04", id, 300000),
      snapshot("2026-05", id, 100000),
      snapshot("2026-06", id, -10000),
      snapshot("2026-07", id, -200000),
    ];

    expect(findMortgagePayoffMonth(snapshots, id)).toBe("2026-06");
  });

  it("returns null when the balance never reaches zero", () => {
    const id = "mortgage-1";
    const snapshots: MonthlySnapshot[] = [
      snapshot("2026-04", id, 400000),
      snapshot("2026-05", id, 350000),
      snapshot("2026-06", id, 300000),
    ];

    expect(findMortgagePayoffMonth(snapshots, id)).toBeNull();
  });

  it("returns null when snapshots array is empty", () => {
    expect(findMortgagePayoffMonth([], "mortgage-1")).toBeNull();
  });
});

describe("findMilestoneMonth", () => {
  it("returns the first month where an asset account projected balance meets or exceeds the target", () => {
    const id = "tagesgeld-1";
    const snapshots: MonthlySnapshot[] = [
      snapshot("2026-04", id, 50000),
      snapshot("2026-05", id, 80000),
      snapshot("2026-06", id, 100000),
      snapshot("2026-07", id, 120000),
    ];

    expect(findMilestoneMonth(snapshots, id, 100000, "Tagesgeld")).toBe(
      "2026-06"
    );
  });

  it("returns null when an asset account never reaches the target", () => {
    const id = "tagesgeld-1";
    const snapshots: MonthlySnapshot[] = [
      snapshot("2026-04", id, 50000),
      snapshot("2026-05", id, 60000),
      snapshot("2026-06", id, 70000),
    ];

    expect(findMilestoneMonth(snapshots, id, 100000, "Tagesgeld")).toBeNull();
  });

  it("returns the first month where a Mortgage projected balance falls to or below the target", () => {
    const id = "mortgage-1";
    const snapshots: MonthlySnapshot[] = [
      snapshot("2026-04", id, 4000000),
      snapshot("2026-05", id, 3500000),
      snapshot("2026-06", id, 3000000),
      snapshot("2026-07", id, 2500000),
    ];

    expect(findMilestoneMonth(snapshots, id, 3000000, "Mortgage")).toBe(
      "2026-06"
    );
  });

  it("returns null when a Mortgage balance never falls to the target", () => {
    const id = "mortgage-1";
    const snapshots: MonthlySnapshot[] = [
      snapshot("2026-04", id, 4000000),
      snapshot("2026-05", id, 3800000),
      snapshot("2026-06", id, 3600000),
    ];

    expect(findMilestoneMonth(snapshots, id, 3000000, "Mortgage")).toBeNull();
  });
});

describe("buildAccountColumns", () => {
  const account = (
    id: string,
    name: string,
    kind: AccountWithBalance["kind"]
  ): AccountWithBalance => ({
    id: id,
    kind,
    name,
    openingBalance: 0,
    openingDate: "2026-01-01",
    balance: 0,
  });

  it("returns empty array for empty input", () => {
    expect(buildAccountColumns([])).toEqual([]);
  });

  it("excludes Mortgage accounts", () => {
    const accounts = [
      account("m1", "DSL Mortgage", "Mortgage"),
      account("g1", "Main", "Girokonto"),
    ];
    const columns = buildAccountColumns(accounts);
    expect(columns.map((c) => c.id)).not.toContain("m1");
    expect(columns.map((c) => c.id)).toContain("g1");
  });

  it("orders kinds: Girokonto before Tagesgeld before Investment before CreditCard", () => {
    const accounts = [
      account("cc1", "Amex", "CreditCard"),
      account("i1", "ETF", "Investment"),
      account("t1", "Tagesgeld", "Tagesgeld"),
      account("g1", "Main", "Girokonto"),
    ];
    const columns = buildAccountColumns(accounts);
    const kinds = columns.map((c) => c.kind);
    expect(kinds.indexOf("Girokonto")).toBeLessThan(kinds.indexOf("Tagesgeld"));
    expect(kinds.indexOf("Tagesgeld")).toBeLessThan(
      kinds.indexOf("Investment")
    );
    expect(kinds.indexOf("Investment")).toBeLessThan(
      kinds.indexOf("CreditCard")
    );
  });

  it("preserves account id and name on each output column", () => {
    const accounts = [account("g1", "My Girokonto", "Girokonto")];
    const columns = buildAccountColumns(accounts);
    expect(columns[0]).toEqual({
      id: "g1",
      name: "My Girokonto",
      kind: "Girokonto",
    });
  });

  it("includes multiple accounts of the same kind and preserves their relative order", () => {
    const accounts = [
      account("g1", "Main", "Girokonto"),
      account("g2", "Sparkasse", "Girokonto"),
    ];
    const columns = buildAccountColumns(accounts);
    expect(columns).toHaveLength(2);
    expect(columns[0].id).toBe("g1");
    expect(columns[1].id).toBe("g2");
  });

  it("returns empty array when all accounts are Mortgages", () => {
    const accounts = [
      account("m1", "DSL Mortgage", "Mortgage"),
      account("m2", "Second Mortgage", "Mortgage"),
    ];
    expect(buildAccountColumns(accounts)).toEqual([]);
  });
});

const rt = (
  overrides: Partial<RecurringTransaction> & Pick<RecurringTransaction, "id">
): RecurringTransaction => ({
  accountId: "tagesgeld-1",
  amount: 500000,
  description: "Sondertilgung",
  category: "Mortgage",
  frequency: "annual",
  dayOfMonth: 1,
  isActive: true,
  ...overrides,
});

const mortgageAccount = { id: "mortgage-1", kind: "Mortgage" as const };
const tagesgeldAccount = { id: "tagesgeld-1", kind: "Tagesgeld" as const };

describe("deriveSTMonths", () => {
  it("returns the correct month and amount for an annual RT whose linkedAccountId is a Mortgage account", () => {
    const recurring = [rt({ id: "rt-1", linkedAccountId: "mortgage-1" })];
    const accounts = [mortgageAccount, tagesgeldAccount];

    const result = deriveSTMonths(recurring, accounts, "2026-01", 12);

    expect(result.has("2026-01")).toBe(true);
    expect(result.get("2026-01")).toBe(500000);
  });

  it("returns multiple ST months when the projection window spans multiple years", () => {
    const recurring = [rt({ id: "rt-1", linkedAccountId: "mortgage-1" })];
    const accounts = [mortgageAccount, tagesgeldAccount];

    const result = deriveSTMonths(recurring, accounts, "2026-01", 24);

    expect(result.has("2026-01")).toBe(true);
    expect(result.has("2027-01")).toBe(true);
    expect(result.size).toBe(2);
  });

  it("never includes monthly recurring transactions", () => {
    const recurring = [
      rt({ id: "rt-1", frequency: "monthly", linkedAccountId: "mortgage-1" }),
    ];
    const accounts = [mortgageAccount, tagesgeldAccount];

    const result = deriveSTMonths(recurring, accounts, "2026-01", 12);

    expect(result.size).toBe(0);
  });

  it("never includes quarterly recurring transactions", () => {
    const recurring = [
      rt({
        id: "rt-1",
        frequency: "quarterly",
        linkedAccountId: "mortgage-1",
      }),
    ];
    const accounts = [mortgageAccount, tagesgeldAccount];

    const result = deriveSTMonths(recurring, accounts, "2026-01", 12);

    expect(result.size).toBe(0);
  });

  it("never includes annual RTs with no linkedAccountId", () => {
    const recurring = [rt({ id: "rt-1" })];
    const accounts = [mortgageAccount, tagesgeldAccount];

    const result = deriveSTMonths(recurring, accounts, "2026-01", 12);

    expect(result.size).toBe(0);
  });

  it("never includes annual RTs whose linkedAccountId points to a non-Mortgage account", () => {
    const investmentAccount = { id: "invest-1", kind: "Investment" as const };
    const recurring = [rt({ id: "rt-1", linkedAccountId: "invest-1" })];
    const accounts = [investmentAccount, tagesgeldAccount];

    const result = deriveSTMonths(recurring, accounts, "2026-01", 12);

    expect(result.size).toBe(0);
  });

  it("returns an empty map when recurringTransactions is empty", () => {
    const accounts = [mortgageAccount, tagesgeldAccount];

    const result = deriveSTMonths([], accounts, "2026-01", 12);

    expect(result.size).toBe(0);
  });

  it("returns an empty map when accounts is empty", () => {
    const recurring = [rt({ id: "rt-1", linkedAccountId: "mortgage-1" })];

    const result = deriveSTMonths(recurring, [], "2026-01", 12);

    expect(result.size).toBe(0);
  });

  it("fires in the monthOfYear month when monthOfYear is set, not in the projection-start month", () => {
    // Projection starts in April, ST should fire in October
    const recurring = [
      rt({ id: "rt-1", linkedAccountId: "mortgage-1", monthOfYear: 10 }),
    ];
    const accounts = [mortgageAccount, tagesgeldAccount];

    const result = deriveSTMonths(recurring, accounts, "2026-04", 12);

    expect(result.has("2026-10")).toBe(true);
    expect(result.has("2026-04")).toBe(false);
  });

  it("fires in the correct monthOfYear month across multiple projected years", () => {
    const recurring = [
      rt({ id: "rt-1", linkedAccountId: "mortgage-1", monthOfYear: 10 }),
    ];
    const accounts = [mortgageAccount, tagesgeldAccount];

    const result = deriveSTMonths(recurring, accounts, "2026-04", 24);

    expect(result.has("2026-10")).toBe(true);
    expect(result.has("2027-10")).toBe(true);
    expect(result.size).toBe(2);
  });

  it("does not fire in the projection-start month when monthOfYear is set to a different month", () => {
    const recurring = [
      rt({ id: "rt-1", linkedAccountId: "mortgage-1", monthOfYear: 10 }),
    ];
    const accounts = [mortgageAccount, tagesgeldAccount];

    const result = deriveSTMonths(recurring, accounts, "2026-04", 12);

    expect(result.has("2026-04")).toBe(false);
  });
});

const snap = (
  month: string,
  totalLiquid: number,
  accountBalances: Record<string, number> = {}
): MonthlySnapshot => ({
  month,
  totalLiquid,
  netCashflow: 0,
  accounts: Object.fromEntries(
    Object.entries(accountBalances).map(([id, projected]) => [
      id,
      { projected },
    ])
  ),
});

describe("deriveYearSummaries", () => {
  it("returns one row per projected year using the December snapshot", () => {
    const snapshots = [
      snap("2026-10", 10000),
      snap("2026-11", 11000),
      snap("2026-12", 12000),
      snap("2027-10", 20000),
      snap("2027-11", 21000),
      snap("2027-12", 22000),
    ];

    const rows = deriveYearSummaries(snapshots, [], new Map());

    expect(rows).toHaveLength(2);
    expect(rows[0].year).toBe(2026);
    expect(rows[0].totalLiquid).toBe(12000);
    expect(rows[1].year).toBe(2027);
    expect(rows[1].totalLiquid).toBe(22000);
  });

  it("uses the last available snapshot when December is not in the window", () => {
    const snapshots = [
      snap("2026-10", 10000),
      snap("2026-11", 11000),
      snap("2026-12", 12000),
      snap("2027-10", 20000),
      snap("2027-11", 21000),
    ];

    const rows = deriveYearSummaries(snapshots, [], new Map());

    expect(rows).toHaveLength(2);
    expect(rows[1].year).toBe(2027);
    expect(rows[1].totalLiquid).toBe(21000);
  });

  it("returns stAmount equal to the ST fired in that year from the stMonths map", () => {
    const snapshots = [
      snap("2026-10", 10000),
      snap("2026-11", 11000),
      snap("2026-12", 12000),
    ];
    const stMonths = new Map([["2026-10", 500000]]);

    const rows = deriveYearSummaries(snapshots, [], stMonths);

    expect(rows[0].stAmount).toBe(500000);
  });

  it("returns stAmount null for years with no ST events", () => {
    const snapshots = [
      snap("2026-10", 10000),
      snap("2026-11", 11000),
      snap("2026-12", 12000),
    ];

    const rows = deriveYearSummaries(snapshots, [], new Map());

    expect(rows[0].stAmount).toBeNull();
  });

  it("returns restschuld as the sum of all mortgage account projected balances in the year-end snapshot", () => {
    const snapshots = [
      snap("2026-12", 12000, {
        "mortgage-1": 3000000,
        "mortgage-2": 1500000,
      }),
    ];

    const rows = deriveYearSummaries(
      snapshots,
      ["mortgage-1", "mortgage-2"],
      new Map()
    );

    expect(rows[0].restschuld).toBe(4500000);
  });

  it("returns restschuld null when no mortgageAccountIds are provided", () => {
    const snapshots = [snap("2026-12", 12000)];

    const rows = deriveYearSummaries(snapshots, [], new Map());

    expect(rows[0].restschuld).toBeNull();
  });

  it("returns an empty array when snapshots is empty", () => {
    const rows = deriveYearSummaries([], [], new Map());

    expect(rows).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// buildTrajectoryData
// ---------------------------------------------------------------------------

const trajSnap = (
  month: string,
  totalLiquid: number,
  netCashflow: number,
  accountBalances: Record<string, number> = {}
): MonthlySnapshot => ({
  month,
  totalLiquid,
  netCashflow,
  accounts: Object.fromEntries(
    Object.entries(accountBalances).map(([id, projected]) => [
      id,
      { projected },
    ])
  ),
});

const account = (
  id: string,
  kind: AccountWithBalance["kind"],
  name = id
): AccountWithBalance => ({
  id: id,
  kind,
  name,
  openingBalance: 0,
  openingDate: "2026-01-01",
  balance: 0,
});

describe("buildTrajectoryData", () => {
  it("returns an empty array when snapshots is empty", () => {
    expect(buildTrajectoryData([], new Map(), null, [])).toEqual([]);
  });

  it("output length matches input snapshots length", () => {
    const snapshots = [
      trajSnap("2026-04", 100000, 5000),
      trajSnap("2026-05", 105000, 5000),
      trajSnap("2026-06", 110000, 5000),
    ];

    const result = buildTrajectoryData(snapshots, new Map(), null, []);

    expect(result).toHaveLength(3);
  });

  it("each point has all required fields", () => {
    const snapshots = [trajSnap("2026-04", 100000, 5000)];

    const [point] = buildTrajectoryData(snapshots, new Map(), null, []);

    expect(point).toHaveProperty("monthIndex");
    expect(point).toHaveProperty("label");
    expect(point).toHaveProperty("totalLiquid");
    expect(point).toHaveProperty("restschuld");
    expect(point).toHaveProperty("isSTMonth");
    expect(point).toHaveProperty("isPayoffMonth");
  });

  it("does not include netCashflow on the data point", () => {
    const snapshots = [trajSnap("2026-04", 100000, 5000)];

    const [point] = buildTrajectoryData(snapshots, new Map(), null, []);

    expect(point).not.toHaveProperty("netCashflow");
  });

  it("monthIndex is the 0-based position in the array", () => {
    const snapshots = [
      trajSnap("2026-04", 100000, 5000),
      trajSnap("2026-05", 105000, 5000),
      trajSnap("2026-06", 110000, 5000),
    ];

    const result = buildTrajectoryData(snapshots, new Map(), null, []);

    expect(result[0].monthIndex).toBe(0);
    expect(result[1].monthIndex).toBe(1);
    expect(result[2].monthIndex).toBe(2);
  });

  it("label matches the snapshot month string", () => {
    const snapshots = [
      trajSnap("2026-04", 100000, 5000),
      trajSnap("2026-05", 105000, 5000),
    ];

    const result = buildTrajectoryData(snapshots, new Map(), null, []);

    expect(result[0].label).toBe("2026-04");
    expect(result[1].label).toBe("2026-05");
  });

  it("totalLiquid comes from the snapshot", () => {
    const snapshots = [trajSnap("2026-04", 123456, 7890)];

    const [point] = buildTrajectoryData(snapshots, new Map(), null, []);

    expect(point.totalLiquid).toBe(123456);
  });

  it("restschuld is the sum of mortgage account projected balances", () => {
    const snapshots = [
      trajSnap("2026-04", 100000, 0, {
        "mortgage-1": 2000000,
        "mortgage-2": 500000,
        "giro-1": 100000,
      }),
    ];

    const [point] = buildTrajectoryData(snapshots, new Map(), null, [
      account("mortgage-1", "Mortgage"),
      account("mortgage-2", "Mortgage"),
      account("giro-1", "Girokonto"),
    ]);

    expect(point.restschuld).toBe(2500000);
  });

  it("restschuld is 0 when no Mortgage accounts are provided", () => {
    const snapshots = [
      trajSnap("2026-04", 100000, 0, { "mortgage-1": 2000000 }),
    ];

    const [point] = buildTrajectoryData(snapshots, new Map(), null, []);

    expect(point.restschuld).toBe(0);
  });

  it("restschuld is null on and after the month the Mortgage balance reaches zero", () => {
    const snapshots = [
      trajSnap("2026-04", 100000, 0, { "mortgage-1": 200000 }),
      trajSnap("2026-05", 100000, 0, { "mortgage-1": 100000 }),
      trajSnap("2026-06", 100000, 0, { "mortgage-1": 0 }),
      trajSnap("2026-07", 100000, 0, { "mortgage-1": 0 }),
    ];

    const result = buildTrajectoryData(snapshots, new Map(), null, [
      account("mortgage-1", "Mortgage"),
    ]);

    expect(result[0].restschuld).toBe(200000);
    expect(result[1].restschuld).toBe(100000);
    expect(result[2].restschuld).toBeNull();
    expect(result[3].restschuld).toBeNull();
  });

  it("includes per-account projected balance keyed by account id for non-Mortgage accounts", () => {
    const snapshots = [
      trajSnap("2026-04", 0, 0, {
        "giro-1": 500000,
        "tagesgeld-1": 1500000,
        "mortgage-1": 2000000,
      }),
    ];

    const [point] = buildTrajectoryData(snapshots, new Map(), null, [
      account("giro-1", "Girokonto"),
      account("tagesgeld-1", "Tagesgeld"),
      account("mortgage-1", "Mortgage"),
    ]);

    expect(point["giro-1"]).toBe(500000);
    expect(point["tagesgeld-1"]).toBe(1500000);
    expect(point["mortgage-1"]).toBeUndefined();
  });

  it("isSTMonth is true for months present in the stMonths map", () => {
    const snapshots = [
      trajSnap("2026-04", 100000, 0),
      trajSnap("2026-10", 100000, 0),
    ];
    const stMonths = new Map([["2026-10", 500000]]);

    const result = buildTrajectoryData(snapshots, stMonths, null, []);

    expect(result[0].isSTMonth).toBe(false);
    expect(result[1].isSTMonth).toBe(true);
  });

  it("all isSTMonth are false when stMonths map is empty", () => {
    const snapshots = [
      trajSnap("2026-04", 100000, 0),
      trajSnap("2026-05", 100000, 0),
    ];

    const result = buildTrajectoryData(snapshots, new Map(), null, []);

    result.forEach((p) => expect(p.isSTMonth).toBe(false));
  });

  it("isPayoffMonth is true for the payoff month only", () => {
    const snapshots = [
      trajSnap("2026-04", 100000, 0),
      trajSnap("2026-05", 100000, 0),
      trajSnap("2026-06", 100000, 0),
    ];

    const result = buildTrajectoryData(snapshots, new Map(), "2026-05", []);

    expect(result[0].isPayoffMonth).toBe(false);
    expect(result[1].isPayoffMonth).toBe(true);
    expect(result[2].isPayoffMonth).toBe(false);
  });

  it("all isPayoffMonth are false when payoffMonth is null", () => {
    const snapshots = [
      trajSnap("2026-04", 100000, 0),
      trajSnap("2026-05", 100000, 0),
    ];

    const result = buildTrajectoryData(snapshots, new Map(), null, []);

    result.forEach((p) => expect(p.isPayoffMonth).toBe(false));
  });
});
