import { describe, it, expect } from "vitest";
import { recurringNetPerMonth } from "./recurring";
import type { RecurringTransaction } from "../../types/recurring";

/**
 * Build a RecurringTransaction fixture with sensible defaults so each test
 * only states the fields it cares about (account, amount, frequency, link).
 */
function rt(overrides: Partial<RecurringTransaction>): RecurringTransaction {
  return {
    id: "rt-1",
    accountId: "acc-1",
    amount: -100000,
    description: "Recurring",
    category: "general",
    frequency: "monthly",
    dayOfMonth: 1,
    ...overrides,
  };
}

describe("recurringNetPerMonth", () => {
  it("counts a monthly recurring at its full amount", () => {
    const items = [
      rt({ accountId: "acc-1", amount: -120000, frequency: "monthly" }),
    ];
    expect(recurringNetPerMonth(items, "acc-1")).toBe(-120000);
  });

  it("weights an annual recurring by 1/12", () => {
    const items = [
      rt({ accountId: "acc-1", amount: -120000, frequency: "annual" }),
    ];
    expect(recurringNetPerMonth(items, "acc-1")).toBe(-10000);
  });

  it("weights a quarterly recurring by 1/3", () => {
    const items = [
      rt({ accountId: "acc-1", amount: -90000, frequency: "quarterly" }),
    ];
    expect(recurringNetPerMonth(items, "acc-1")).toBe(-30000);
  });

  it("sums mixed-frequency, mixed-sign recurrings (income minus expenses)", () => {
    const items = [
      rt({
        id: "salary",
        accountId: "acc-1",
        amount: 300000,
        frequency: "monthly",
      }),
      rt({
        id: "rent",
        accountId: "acc-1",
        amount: -120000,
        frequency: "monthly",
      }),
      rt({
        id: "insurance",
        accountId: "acc-1",
        amount: -60000,
        frequency: "annual",
      }),
    ];
    // 300000 - 120000 + round(-60000/12) = 300000 - 120000 - 5000
    expect(recurringNetPerMonth(items, "acc-1")).toBe(175000);
  });

  it("excludes recurrings belonging to other accounts", () => {
    const items = [
      rt({
        id: "mine",
        accountId: "acc-1",
        amount: -120000,
        frequency: "monthly",
      }),
      rt({
        id: "theirs",
        accountId: "acc-2",
        amount: -500000,
        frequency: "monthly",
      }),
    ];
    expect(recurringNetPerMonth(items, "acc-1")).toBe(-120000);
  });

  it("does not count a transfer toward its linked (target) account's net", () => {
    // A savings transfer leaving acc-1 into acc-2: it belongs to acc-1, and
    // acc-2 is only the linkedAccountId target — it must not affect acc-2's net.
    const items = [
      rt({
        id: "savings-transfer",
        accountId: "acc-1",
        linkedAccountId: "acc-2",
        amount: -50000,
        frequency: "monthly",
      }),
    ];
    expect(recurringNetPerMonth(items, "acc-2")).toBe(0);
    expect(recurringNetPerMonth(items, "acc-1")).toBe(-50000);
  });

  it("returns 0 for an account with no recurrings", () => {
    expect(recurringNetPerMonth([], "acc-1")).toBe(0);
  });

  it("rounds fractional cents to the nearest integer cent", () => {
    // -100000 / 12 = -8333.33 → -8333
    const items = [
      rt({ accountId: "acc-1", amount: -100000, frequency: "annual" }),
    ];
    expect(recurringNetPerMonth(items, "acc-1")).toBe(-8333);
  });
});
