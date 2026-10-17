import { describe, expect, it } from "vitest";
import { deriveMonthCashFlow } from "./monthCashFlow.js";
import {
  projectMonths,
  toProjectionAccountEntry,
  toProjectionRecurringEntry,
} from "../projection/projection.js";
import type {
  Account,
  AccountKind,
  RecurringTransaction,
} from "../../storage/types.js";

function account(id: string, kind: AccountKind, anchorBalance = 0): Account {
  return {
    id,
    kind,
    name: id,
    anchorBalance,
    anchorDate: "2026-02-15",
    showInTrajectory: true,
  };
}

function rule(
  id: string,
  overrides: Partial<RecurringTransaction>
): RecurringTransaction {
  return {
    id,
    accountId: "giro",
    amount: -1000,
    description: id,
    category: "Misc",
    frequency: "monthly",
    dayOfMonth: 1,
    ...overrides,
  };
}

// Accounts in their sortOrder, as storage's findAll returns them. Every kind
// is present. Restschuld €1,500 known on 15 Feb: the €1,000 rate pays it down
// in March, is capped at the €500 left in April, and moves nothing in May.
const accounts: Account[] = [
  account("giro", "Girokonto", 500000),
  account("savings", "Tagesgeld"),
  account("mortgage", "Mortgage", 150000),
  account("visa", "CreditCard"),
  account("etf", "Investment"),
];

const recurrings: RecurringTransaction[] = [
  rule("salary", {
    amount: 300000,
    description: "Salary",
    category: "Income",
    dayOfMonth: 25,
  }),
  rule("save", {
    amount: 20000,
    description: "Savings plan",
    category: "Transfer",
    dayOfMonth: 3,
    linkedAccountId: "savings",
  }),
  rule("rate", {
    amount: 100000,
    description: "Darlehen",
    category: "Housing",
    dayOfMonth: 1,
    linkedAccountId: "mortgage",
  }),
  rule("fee", {
    accountId: "mortgage",
    amount: -1000,
    description: "Account fee",
    dayOfMonth: 10,
  }),
  rule("netflix", {
    amount: -1299,
    description: "Netflix",
    category: "Entertainment",
    dayOfMonth: 12,
  }),
  rule("insurance", {
    amount: -30000,
    description: "Insurance",
    frequency: "quarterly",
    monthOfYear: 2,
    dayOfMonth: 15,
  }),
  rule("tax", {
    amount: -12000,
    description: "Car tax",
    frequency: "annual",
    monthOfYear: 6,
    dayOfMonth: 20,
  }),
];

function report(month: string) {
  const projected = projectMonths(
    accounts.map(toProjectionAccountEntry),
    [],
    recurrings.map(toProjectionRecurringEntry),
    "2026-03",
    "2026-03",
    12
  );
  return deriveMonthCashFlow(month, projected, accounts, recurrings);
}

function flowsOf(month: string, accountId: string) {
  return (
    report(month).accounts.find((g) => g.accountId === accountId)?.flows ?? []
  );
}

describe("deriveMonthCashFlow — groups", () => {
  it("returns the month and one group per account, every kind included, in sortOrder", () => {
    const r = report("2026-05");

    expect(r.month).toBe("2026-05");
    expect(r.accounts.map((g) => g.accountId)).toEqual([
      "giro",
      "savings",
      "mortgage",
      "visa",
      "etf",
    ]);
  });

  it("keeps an account with no flows as an empty group", () => {
    expect(flowsOf("2026-05", "etf")).toEqual([]);
    expect(flowsOf("2026-05", "visa")).toEqual([]);
  });

  it("orders each group's rows by date", () => {
    const dates = flowsOf("2026-05", "giro").map((f) => f.date);

    expect(dates).toEqual([...dates].sort());
    expect(dates).toEqual([
      "2026-05-03",
      "2026-05-12",
      "2026-05-15",
      "2026-05-25",
    ]);
  });

  it("returns empty groups for a month the run does not cover", () => {
    const r = report("2025-12");

    expect(r.month).toBe("2025-12");
    expect(r.accounts).toHaveLength(accounts.length);
    for (const group of r.accounts) expect(group.flows).toEqual([]);
  });
});

describe("deriveMonthCashFlow — recurring rows", () => {
  it("lists a plain leg as a recurring row joined with its rule's description and category", () => {
    expect(flowsOf("2026-05", "giro")).toContainEqual(
      expect.objectContaining({
        kind: "recurring",
        recurringId: "salary",
        date: "2026-05-25",
        description: "Salary",
        category: "Income",
        amount: 300000,
      })
    );
  });

  it("lists a plain leg without a counterpart or side", () => {
    const salary = flowsOf("2026-05", "giro").find(
      (f) => f.recurringId === "salary"
    );

    expect(salary?.counterpartId).toBeUndefined();
    expect(salary?.side).toBeUndefined();
  });

  it("lists a transfer's source leg as an outflow naming its destination", () => {
    expect(flowsOf("2026-05", "giro")).toContainEqual(
      expect.objectContaining({
        recurringId: "save",
        description: "Savings plan",
        amount: -20000,
        counterpartId: "savings",
        side: "source",
      })
    );
  });

  it("lists a transfer's destination leg as an inflow naming its source", () => {
    expect(flowsOf("2026-05", "savings")).toEqual([
      expect.objectContaining({
        kind: "recurring",
        recurringId: "save",
        date: "2026-05-03",
        description: "Savings plan",
        amount: 20000,
        counterpartId: "giro",
        side: "destination",
      }),
    ]);
  });

  it("lists a Repayment Transfer as an inflow on the Mortgage", () => {
    expect(flowsOf("2026-03", "mortgage")).toEqual([
      expect.objectContaining({
        recurringId: "rate",
        description: "Darlehen",
        amount: 100000,
        counterpartId: "giro",
        side: "destination",
      }),
    ]);
  });

  it("caps the Repayment Transfer at the Restschuld left in the payoff month", () => {
    expect(flowsOf("2026-04", "mortgage")).toEqual([
      expect.objectContaining({ recurringId: "rate", amount: 50000 }),
    ]);
    expect(flowsOf("2026-04", "giro")).toContainEqual(
      expect.objectContaining({ recurringId: "rate", amount: -50000 })
    );
  });

  it("leaves out a Repayment Transfer capped to zero", () => {
    const all = report("2026-05").accounts.flatMap((g) => g.flows);

    expect(all.filter((f) => f.recurringId === "rate")).toEqual([]);
  });

  it("leaves out a plain recurring on a Mortgage", () => {
    for (const month of ["2026-03", "2026-04", "2026-05"]) {
      const all = report(month).accounts.flatMap((g) => g.flows);
      expect(all.filter((f) => f.recurringId === "fee")).toEqual([]);
    }
  });

  it("lists a quarterly rule only in the months of its cycle", () => {
    const has = (month: string) =>
      flowsOf(month, "giro").some((f) => f.recurringId === "insurance");

    expect(has("2026-05")).toBe(true);
    expect(has("2026-08")).toBe(true);
    expect(has("2026-06")).toBe(false);
    expect(has("2026-07")).toBe(false);
  });

  it("lists an annual rule only in its month", () => {
    const has = (month: string) =>
      flowsOf(month, "giro").some((f) => f.recurringId === "tax");

    expect(has("2026-06")).toBe(true);
    expect(has("2026-05")).toBe(false);
    expect(has("2026-07")).toBe(false);
  });
});
