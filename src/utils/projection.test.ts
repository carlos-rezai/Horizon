import { describe, it, expect } from "vitest";
import {
  findMortgagePayoffMonth,
  findMilestoneMonth,
  buildAccountColumns,
} from "./projection";
import type { MonthlySnapshot } from "../types/projection";
import type { AccountWithBalance } from "../types/account";

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
