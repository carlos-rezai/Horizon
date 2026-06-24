import { describe, expect, it } from "vitest";
import {
  computeYearComparison,
  type YcAccountEntry,
  type YcTxEntry,
} from "./yearComparison.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const GIRO: YcAccountEntry = { id: "giro", kind: "Girokonto" };
const TAGES: YcAccountEntry = { id: "tages", kind: "Tagesgeld" };
const CC: YcAccountEntry = { id: "cc", kind: "CreditCard" };
const MORTGAGE: YcAccountEntry = { id: "mort", kind: "Mortgage" };
const INVEST: YcAccountEntry = { id: "inv", kind: "Investment" };

function tx(overrides: Partial<YcTxEntry> = {}): YcTxEntry {
  return {
    accountId: "giro",
    date: "2026-03-15",
    amount: -1000,
    category: "Groceries",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Window math — this year
// ---------------------------------------------------------------------------

describe("computeYearComparison — window (this year)", () => {
  it("includes whole calendar months from January through the viewed month inclusive", () => {
    const txs = [
      tx({ date: "2026-01-10", amount: -1000, category: "Groceries" }),
      tx({ date: "2026-06-30", amount: -2000, category: "Groceries" }),
    ];

    const rows = computeYearComparison(txs, [GIRO], "2026-06");

    expect(rows).toEqual([
      { category: "Groceries", thisYear: 3000, lastYear: 0 },
    ]);
  });

  it("excludes months after the viewed month in the same year", () => {
    const txs = [
      tx({ date: "2026-03-01", amount: -1000, category: "Groceries" }),
      // July is after the June viewed month — excluded
      tx({ date: "2026-07-01", amount: -5000, category: "Groceries" }),
    ];

    const rows = computeYearComparison(txs, [GIRO], "2026-06");

    expect(rows).toEqual([
      { category: "Groceries", thisYear: 1000, lastYear: 0 },
    ]);
  });

  it("counts an in-progress viewed month as a whole calendar month", () => {
    const txs = [
      // late in the viewed month — still inside the whole-month window
      tx({ date: "2026-06-29", amount: -4000, category: "Groceries" }),
    ];

    const rows = computeYearComparison(txs, [GIRO], "2026-06");

    expect(rows).toEqual([
      { category: "Groceries", thisYear: 4000, lastYear: 0 },
    ]);
  });
});

// ---------------------------------------------------------------------------
// Window math — last year (prior-year twin span)
// ---------------------------------------------------------------------------

describe("computeYearComparison — window (last year)", () => {
  it("pairs the identical Jan-through-viewed-month span one year earlier into lastYear", () => {
    const txs = [
      // last year, inside Jan–June 2025
      tx({ date: "2025-02-01", amount: -3000, category: "Groceries" }),
      tx({ date: "2025-06-15", amount: -1000, category: "Groceries" }),
      // last year, AFTER June — must be excluded from the prior-year window
      tx({ date: "2025-09-01", amount: -9000, category: "Groceries" }),
      // this year
      tx({ date: "2026-04-01", amount: -2000, category: "Groceries" }),
    ];

    const rows = computeYearComparison(txs, [GIRO], "2026-06");

    expect(rows).toEqual([
      { category: "Groceries", thisYear: 2000, lastYear: 4000 },
    ]);
  });

  it("excludes spending older than the prior-year window", () => {
    const txs = [
      // two years before the viewed month — outside both windows
      tx({ date: "2024-05-01", amount: -7000, category: "Groceries" }),
      tx({ date: "2026-05-01", amount: -1000, category: "Groceries" }),
    ];

    const rows = computeYearComparison(txs, [GIRO], "2026-06");

    expect(rows).toEqual([
      { category: "Groceries", thisYear: 1000, lastYear: 0 },
    ]);
  });
});

// ---------------------------------------------------------------------------
// Spending-account filtering
// ---------------------------------------------------------------------------

describe("computeYearComparison — spending-account filtering", () => {
  it("counts spending on all spending kinds (Girokonto, Tagesgeld, CreditCard)", () => {
    const txs = [
      tx({ accountId: "giro", amount: -1000, category: "Groceries" }),
      tx({ accountId: "tages", amount: -2000, category: "Groceries" }),
      tx({ accountId: "cc", amount: -3000, category: "Groceries" }),
    ];

    const rows = computeYearComparison(txs, [GIRO, TAGES, CC], "2026-06");

    expect(rows).toEqual([
      { category: "Groceries", thisYear: 6000, lastYear: 0 },
    ]);
  });

  it("excludes Mortgage and Investment accounts by kind", () => {
    const txs = [
      tx({ accountId: "giro", amount: -1000, category: "Groceries" }),
      tx({ accountId: "mort", amount: -50000, category: "Groceries" }),
      tx({ accountId: "inv", amount: -90000, category: "Groceries" }),
    ];

    const rows = computeYearComparison(
      txs,
      [GIRO, MORTGAGE, INVEST],
      "2026-06"
    );

    expect(rows).toEqual([
      { category: "Groceries", thisYear: 1000, lastYear: 0 },
    ]);
  });
});

// ---------------------------------------------------------------------------
// Ranking and top-5 cap
// ---------------------------------------------------------------------------

describe("computeYearComparison — ranking and cap", () => {
  it("ranks categories by thisYear descending", () => {
    const txs = [
      tx({ amount: -1000, category: "Small" }),
      tx({ amount: -5000, category: "Big" }),
      tx({ amount: -3000, category: "Mid" }),
    ];

    const rows = computeYearComparison(txs, [GIRO], "2026-06");

    expect(rows.map((r) => r.category)).toEqual(["Big", "Mid", "Small"]);
  });

  it("returns at most five categories (top five by thisYear)", () => {
    const txs = [
      tx({ amount: -100, category: "C1" }),
      tx({ amount: -200, category: "C2" }),
      tx({ amount: -300, category: "C3" }),
      tx({ amount: -400, category: "C4" }),
      tx({ amount: -500, category: "C5" }),
      tx({ amount: -600, category: "C6" }),
    ];

    const rows = computeYearComparison(txs, [GIRO], "2026-06");

    expect(rows).toHaveLength(5);
    expect(rows.map((r) => r.category)).toEqual(["C6", "C5", "C4", "C3", "C2"]);
  });
});
