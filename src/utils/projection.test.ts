import { describe, it, expect } from "vitest";
import {
  findMortgagePayoffMonth,
  findMilestoneMonth,
  buildAccountColumns,
  deriveSTMonths,
  deriveYearSummaries,
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
    _id: id,
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
  overrides: Partial<RecurringTransaction> & Pick<RecurringTransaction, "_id">
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

const mortgageAccount = { _id: "mortgage-1", kind: "Mortgage" as const };
const tagesgeldAccount = { _id: "tagesgeld-1", kind: "Tagesgeld" as const };

describe("deriveSTMonths", () => {
  it("returns the correct month and amount for an annual RT whose linkedAccountId is a Mortgage account", () => {
    const recurring = [rt({ _id: "rt-1", linkedAccountId: "mortgage-1" })];
    const accounts = [mortgageAccount, tagesgeldAccount];

    const result = deriveSTMonths(recurring, accounts, "2026-01", 12);

    expect(result.has("2026-01")).toBe(true);
    expect(result.get("2026-01")).toBe(500000);
  });

  it("returns multiple ST months when the projection window spans multiple years", () => {
    const recurring = [rt({ _id: "rt-1", linkedAccountId: "mortgage-1" })];
    const accounts = [mortgageAccount, tagesgeldAccount];

    const result = deriveSTMonths(recurring, accounts, "2026-01", 24);

    expect(result.has("2026-01")).toBe(true);
    expect(result.has("2027-01")).toBe(true);
    expect(result.size).toBe(2);
  });

  it("never includes monthly recurring transactions", () => {
    const recurring = [
      rt({ _id: "rt-1", frequency: "monthly", linkedAccountId: "mortgage-1" }),
    ];
    const accounts = [mortgageAccount, tagesgeldAccount];

    const result = deriveSTMonths(recurring, accounts, "2026-01", 12);

    expect(result.size).toBe(0);
  });

  it("never includes quarterly recurring transactions", () => {
    const recurring = [
      rt({
        _id: "rt-1",
        frequency: "quarterly",
        linkedAccountId: "mortgage-1",
      }),
    ];
    const accounts = [mortgageAccount, tagesgeldAccount];

    const result = deriveSTMonths(recurring, accounts, "2026-01", 12);

    expect(result.size).toBe(0);
  });

  it("never includes annual RTs with no linkedAccountId", () => {
    const recurring = [rt({ _id: "rt-1" })];
    const accounts = [mortgageAccount, tagesgeldAccount];

    const result = deriveSTMonths(recurring, accounts, "2026-01", 12);

    expect(result.size).toBe(0);
  });

  it("never includes annual RTs whose linkedAccountId points to a non-Mortgage account", () => {
    const investmentAccount = { _id: "invest-1", kind: "Investment" as const };
    const recurring = [rt({ _id: "rt-1", linkedAccountId: "invest-1" })];
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
    const recurring = [rt({ _id: "rt-1", linkedAccountId: "mortgage-1" })];

    const result = deriveSTMonths(recurring, [], "2026-01", 12);

    expect(result.size).toBe(0);
  });

  it("fires in the monthOfYear month when monthOfYear is set, not in the projection-start month", () => {
    // Projection starts in April, ST should fire in October
    const recurring = [
      rt({ _id: "rt-1", linkedAccountId: "mortgage-1", monthOfYear: 10 }),
    ];
    const accounts = [mortgageAccount, tagesgeldAccount];

    const result = deriveSTMonths(recurring, accounts, "2026-04", 12);

    expect(result.has("2026-10")).toBe(true);
    expect(result.has("2026-04")).toBe(false);
  });

  it("fires in the correct monthOfYear month across multiple projected years", () => {
    const recurring = [
      rt({ _id: "rt-1", linkedAccountId: "mortgage-1", monthOfYear: 10 }),
    ];
    const accounts = [mortgageAccount, tagesgeldAccount];

    const result = deriveSTMonths(recurring, accounts, "2026-04", 24);

    expect(result.has("2026-10")).toBe(true);
    expect(result.has("2027-10")).toBe(true);
    expect(result.size).toBe(2);
  });

  it("does not fire in the projection-start month when monthOfYear is set to a different month", () => {
    const recurring = [
      rt({ _id: "rt-1", linkedAccountId: "mortgage-1", monthOfYear: 10 }),
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
