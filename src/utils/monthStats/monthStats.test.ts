import { describe, it, expect } from "vitest";
import type { Transaction } from "../../types/transaction";
import {
  deriveMonthStats,
  selectVariableSpending,
  daysInMonth,
} from "./monthStats";

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: Math.random().toString(36).slice(2),
    accountId: "a1",
    date: "2026-06-03",
    amount: -1000,
    description: "Expense",
    category: "Food",
    ...overrides,
  };
}

describe("daysInMonth", () => {
  it("returns 30 for a 30-day month", () => {
    expect(daysInMonth("2026-06")).toBe(30);
  });

  it("returns 31 for a 31-day month", () => {
    expect(daysInMonth("2026-07")).toBe(31);
  });

  it("returns 28 for a non-leap February", () => {
    expect(daysInMonth("2026-02")).toBe(28);
  });

  it("returns 29 for a leap February", () => {
    expect(daysInMonth("2028-02")).toBe(29);
  });
});

describe("selectVariableSpending", () => {
  it("keeps plain one-off expenses", () => {
    const txns = [tx({ amount: -5000 }), tx({ amount: -3000 })];
    expect(selectVariableSpending(txns)).toHaveLength(2);
  });

  it("drops transfer legs (transferId set)", () => {
    const txns = [
      tx({ amount: -5000 }),
      tx({ amount: -2000, transferId: "tr1" }),
    ];
    const result = selectVariableSpending(txns);
    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe(-5000);
  });

  it("drops auto-settlement transactions", () => {
    const txns = [
      tx({ amount: -5000 }),
      tx({ amount: -9000, isAutoSettlement: true }),
    ];
    const result = selectVariableSpending(txns);
    expect(result).toHaveLength(1);
    expect(result[0].amount).toBe(-5000);
  });
});

describe("deriveMonthStats", () => {
  it("sums variable spending across the filtered transactions", () => {
    const txns = [
      tx({ amount: -5000, category: "Groceries" }),
      tx({ amount: -3000, category: "Dining" }),
      tx({ amount: -2000, category: "Cat" }),
    ];
    const stats = deriveMonthStats(txns, "2026-06");
    expect(stats.variableSpending).toBe(-10000);
  });

  it("isolates the Cat category total as ofWhichCat", () => {
    const txns = [
      tx({ amount: -5000, category: "Groceries" }),
      tx({ amount: -2000, category: "Cat" }),
      tx({ amount: -1200, category: "Cat" }),
    ];
    const stats = deriveMonthStats(txns, "2026-06");
    expect(stats.ofWhichCat).toBe(-3200);
  });

  it("reports zero ofWhichCat when no Cat spending exists", () => {
    const txns = [tx({ amount: -5000, category: "Groceries" })];
    expect(deriveMonthStats(txns, "2026-06").ofWhichCat).toBe(0);
  });

  it("counts the filtered entries", () => {
    const txns = [
      tx({ amount: -5000 }),
      tx({ amount: -3000 }),
      tx({ amount: -1000, transferId: "tr1" }),
    ];
    expect(deriveMonthStats(txns, "2026-06").entries).toBe(2);
  });

  it("derives avg/day from the calendar days in the month", () => {
    // -90000 cents over 30 days = -3000 cents/day
    const txns = [tx({ amount: -60000 }), tx({ amount: -30000 })];
    expect(deriveMonthStats(txns, "2026-06").avgPerDay).toBe(-3000);
  });

  it("rounds avg/day to whole cents", () => {
    // -10000 over 30 days = -333.33 → -333
    const txns = [tx({ amount: -10000 })];
    expect(deriveMonthStats(txns, "2026-06").avgPerDay).toBe(-333);
  });

  it("excludes transfers and auto-settlement from every figure", () => {
    const txns = [
      tx({ amount: -6000, category: "Groceries" }),
      tx({ amount: -4000, category: "Cat" }),
      tx({ amount: -50000, transferId: "tr1", category: "Cat" }),
      tx({ amount: -90000, isAutoSettlement: true, category: "Groceries" }),
    ];
    const stats = deriveMonthStats(txns, "2026-06");
    expect(stats.variableSpending).toBe(-10000);
    expect(stats.ofWhichCat).toBe(-4000);
    expect(stats.entries).toBe(2);
  });

  it("returns zeros for an empty month", () => {
    const stats = deriveMonthStats([], "2026-06");
    expect(stats).toEqual({
      variableSpending: 0,
      ofWhichCat: 0,
      entries: 0,
      avgPerDay: 0,
    });
  });
});
