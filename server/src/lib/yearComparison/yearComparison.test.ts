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

// ---------------------------------------------------------------------------
// Honest states (issue #146)
// ---------------------------------------------------------------------------

describe("computeYearComparison — empty result", () => {
  it("returns no rows when there are no transactions at all", () => {
    const rows = computeYearComparison([], [GIRO], "2026-06");
    expect(rows).toEqual([]);
  });

  it("returns no rows when no spending falls inside either window", () => {
    const txs = [
      // after the viewed month, this year — out of window
      tx({ date: "2026-09-01", amount: -1000, category: "Groceries" }),
      // two years ago — out of both windows
      tx({ date: "2024-03-01", amount: -2000, category: "Groceries" }),
    ];

    const rows = computeYearComparison(txs, [GIRO], "2026-06");
    expect(rows).toEqual([]);
  });
});

describe("computeYearComparison — first-year case (no prior-year data)", () => {
  it("returns this-year magnitudes with lastYear at zero", () => {
    const txs = [
      tx({ date: "2026-02-01", amount: -3000, category: "Groceries" }),
      tx({ date: "2026-05-01", amount: -1000, category: "Dining" }),
    ];

    const rows = computeYearComparison(txs, [GIRO], "2026-06");

    expect(rows).toEqual([
      { category: "Groceries", thisYear: 3000, lastYear: 0 },
      { category: "Dining", thisYear: 1000, lastYear: 0 },
    ]);
  });
});

describe("computeYearComparison — fewer than five categories", () => {
  it("returns only the categories that exist, with no empty padding", () => {
    const txs = [
      tx({ amount: -1000, category: "Groceries" }),
      tx({ amount: -2000, category: "Dining" }),
      tx({ amount: -3000, category: "Transport" }),
    ];

    const rows = computeYearComparison(txs, [GIRO], "2026-06");

    expect(rows).toHaveLength(3);
    expect(rows.map((r) => r.category)).toEqual([
      "Transport",
      "Dining",
      "Groceries",
    ]);
  });
});

describe("computeYearComparison — drop-off (ranking is by thisYear)", () => {
  it("drops a category with heavy last-year spend but ~zero this year out of the top five", () => {
    const txs = [
      // five categories with this-year spend
      tx({ date: "2026-03-01", amount: -100, category: "C1" }),
      tx({ date: "2026-03-01", amount: -200, category: "C2" }),
      tx({ date: "2026-03-01", amount: -300, category: "C3" }),
      tx({ date: "2026-03-01", amount: -400, category: "C4" }),
      tx({ date: "2026-03-01", amount: -500, category: "C5" }),
      // heavy last year, nothing this year — must fall off the top five
      tx({ date: "2025-03-01", amount: -90000, category: "OldHabit" }),
    ];

    const rows = computeYearComparison(txs, [GIRO], "2026-06");

    expect(rows).toHaveLength(5);
    expect(rows.map((r) => r.category)).not.toContain("OldHabit");
  });
});

// ---------------------------------------------------------------------------
// Module correctness (issue #146)
// ---------------------------------------------------------------------------

describe("computeYearComparison — in-progress whole month", () => {
  it("counts the whole viewed month in both years regardless of day-of-month", () => {
    const txs = [
      // last day of the viewed month, this year — beyond any day-of-month cutoff
      tx({ date: "2026-06-30", amount: -4000, category: "Groceries" }),
      // last day of the same month, last year — prior-year whole-month twin
      tx({ date: "2025-06-30", amount: -1000, category: "Groceries" }),
    ];

    const rows = computeYearComparison(txs, [GIRO], "2026-06");

    expect(rows).toEqual([
      { category: "Groceries", thisYear: 4000, lastYear: 1000 },
    ]);
  });

  it("is stable day to day — the result does not depend on today's date", () => {
    // The function takes only the viewed month, so a transaction dated later
    // in the month than 'today' is still counted: no day-of-month cutoff.
    const txs = [
      tx({ date: "2026-06-28", amount: -4000, category: "Groceries" }),
    ];

    const early = computeYearComparison(txs, [GIRO], "2026-06");
    const late = computeYearComparison(txs, [GIRO], "2026-06");

    expect(early).toEqual(late);
    expect(early).toEqual([
      { category: "Groceries", thisYear: 4000, lastYear: 0 },
    ]);
  });
});

describe("computeYearComparison — absolute-cents summation across mixed signs", () => {
  it("sums magnitudes regardless of sign (a refund adds to the magnitude)", () => {
    const txs = [
      tx({ date: "2026-03-01", amount: -3000, category: "Groceries" }),
      // a positive entry (e.g. a refund) — still contributes its magnitude
      tx({ date: "2026-04-01", amount: 1000, category: "Groceries" }),
    ];

    const rows = computeYearComparison(txs, [GIRO], "2026-06");

    expect(rows).toEqual([
      { category: "Groceries", thisYear: 4000, lastYear: 0 },
    ]);
  });
});

describe("computeYearComparison — transfer and auto-settlement exclusion", () => {
  it("excludes transfer legs (rows carrying a transferId)", () => {
    const txs = [
      tx({ date: "2026-03-01", amount: -1000, category: "Groceries" }),
      tx({
        date: "2026-03-01",
        amount: -50000,
        category: "Groceries",
        transferId: "tr-1",
      }),
    ];

    const rows = computeYearComparison(txs, [GIRO], "2026-06");

    expect(rows).toEqual([
      { category: "Groceries", thisYear: 1000, lastYear: 0 },
    ]);
  });

  it("excludes auto-settlement rows", () => {
    const txs = [
      tx({ date: "2026-03-01", amount: -1000, category: "Groceries" }),
      tx({
        date: "2026-03-01",
        amount: -75000,
        category: "Groceries",
        isAutoSettlement: true,
      }),
    ];

    const rows = computeYearComparison(txs, [GIRO], "2026-06");

    expect(rows).toEqual([
      { category: "Groceries", thisYear: 1000, lastYear: 0 },
    ]);
  });
});
