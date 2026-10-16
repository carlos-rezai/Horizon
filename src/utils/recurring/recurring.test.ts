import { describe, it, expect } from "vitest";
import {
  recurringAmountFor,
  recurringNetPerMonth,
  transferSideFor,
} from "./recurring";
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

  it("counts a transfer negative on its source and positive on its destination", () => {
    // A savings transfer stored positive on its source acc-1, linked to acc-2.
    const items = [
      rt({
        id: "savings-transfer",
        accountId: "acc-1",
        linkedAccountId: "acc-2",
        amount: 50000,
        frequency: "monthly",
      }),
    ];
    expect(recurringNetPerMonth(items, "acc-1")).toBe(-50000);
    expect(recurringNetPerMonth(items, "acc-2")).toBe(50000);
  });

  it("weights a transfer by frequency on both its source and its destination", () => {
    // An annual Sondertilgung of 1,200.00 from acc-1 into the mortgage.
    const items = [
      rt({
        id: "annual-st",
        accountId: "acc-1",
        linkedAccountId: "mortgage",
        amount: 120000,
        frequency: "annual",
      }),
      rt({
        id: "quarterly-transfer",
        accountId: "acc-1",
        linkedAccountId: "mortgage",
        amount: 90000,
        frequency: "quarterly",
      }),
    ];
    // 120000/12 + 90000/3 = 10000 + 30000
    expect(recurringNetPerMonth(items, "acc-1")).toBe(-40000);
    expect(recurringNetPerMonth(items, "mortgage")).toBe(40000);
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

describe("recurringAmountFor", () => {
  it("returns a plain recurring's stored amount on its own account", () => {
    expect(
      recurringAmountFor(rt({ accountId: "acc-1", amount: -120000 }), "acc-1")
    ).toBe(-120000);
    expect(
      recurringAmountFor(rt({ accountId: "acc-1", amount: 300000 }), "acc-1")
    ).toBe(300000);
  });

  it("returns a transfer as negative on its source account", () => {
    const transfer = rt({
      accountId: "acc-1",
      linkedAccountId: "acc-2",
      amount: 95500,
    });
    expect(recurringAmountFor(transfer, "acc-1")).toBe(-95500);
  });

  it("returns a transfer as positive on its destination account", () => {
    const transfer = rt({
      accountId: "acc-1",
      linkedAccountId: "acc-2",
      amount: 95500,
    });
    expect(recurringAmountFor(transfer, "acc-2")).toBe(95500);
  });

  it("returns 0 for an account the recurring does not touch", () => {
    const transfer = rt({
      accountId: "acc-1",
      linkedAccountId: "acc-2",
      amount: 95500,
    });
    const plain = rt({ accountId: "acc-1", amount: -120000 });
    expect(recurringAmountFor(transfer, "acc-3")).toBe(0);
    expect(recurringAmountFor(plain, "acc-3")).toBe(0);
  });
});

describe("transferSideFor", () => {
  const transfer = rt({
    accountId: "giro",
    linkedAccountId: "mortgage",
    amount: 95500,
  });

  it("is the source on the account the transfer is stored on", () => {
    expect(transferSideFor(transfer, "giro")).toBe("source");
  });

  it("is the destination on the account the transfer lands on", () => {
    expect(transferSideFor(transfer, "mortgage")).toBe("destination");
  });

  it("is null on an account the transfer does not touch", () => {
    expect(transferSideFor(transfer, "tagesgeld")).toBeNull();
  });

  it("is null for a plain recurring, even on its own account", () => {
    expect(transferSideFor(rt({ accountId: "giro" }), "giro")).toBeNull();
  });
});
