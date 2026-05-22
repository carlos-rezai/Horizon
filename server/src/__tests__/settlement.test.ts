import { describe, expect, it } from "vitest";
import { computeMissingSettlements } from "../lib/settlement.js";
import type { Account, Transaction } from "../storage/types.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeGiro(id: string): Account {
  return {
    id,
    kind: "Girokonto",
    name: "Girokonto",
    openingBalance: 500000,
    openingDate: "2026-01-01",
  };
}

function makeCc(overrides: Partial<Account> & { id: string }): Account {
  return {
    kind: "CreditCard",
    name: "Credit Card",
    openingBalance: 0,
    openingDate: "2026-01-01",
    linkedAccountId: "giro1",
    settlementDay: 15,
    linkedSince: "2026-01-01",
    ...overrides,
  };
}

function makeTx(
  overrides: Partial<Transaction> & {
    id: string;
    accountId: string;
    date: string;
    amount: number;
  }
): Transaction {
  return { description: "Purchase", category: "Food", ...overrides };
}

// ---------------------------------------------------------------------------
// computeMissingSettlements
// ---------------------------------------------------------------------------

describe("computeMissingSettlements", () => {
  it("emits a settlement transfer when CC closing balance is negative and no settlement exists", () => {
    const accounts = [makeGiro("giro1"), makeCc({ id: "cc1" })];
    const transactions = [
      makeTx({
        id: "t1",
        accountId: "cc1",
        date: "2026-01-20",
        amount: -10000,
      }),
    ];

    const result = computeMissingSettlements(
      accounts,
      transactions,
      "2026-02-28"
    );

    expect(result).toHaveLength(1);
    expect(result[0].fromAccountId).toBe("giro1");
    expect(result[0].toAccountId).toBe("cc1");
    expect(result[0].isAutoSettlement).toBe(true);
  });

  it("emits nothing when CC closing balance is zero", () => {
    const accounts = [
      makeGiro("giro1"),
      makeCc({ id: "cc1", openingBalance: 0 }),
    ];

    const result = computeMissingSettlements(accounts, [], "2026-02-28");

    expect(result).toHaveLength(0);
  });

  it("emits nothing when CC closing balance is positive", () => {
    const accounts = [
      makeGiro("giro1"),
      makeCc({ id: "cc1", openingBalance: 5000 }),
    ];

    const result = computeMissingSettlements(accounts, [], "2026-02-28");

    expect(result).toHaveLength(0);
  });

  it("emits nothing for months before linkedSince", () => {
    // linkedSince is March; asOf is February → no months in iteration range
    const accounts = [
      makeGiro("giro1"),
      makeCc({ id: "cc1", linkedSince: "2026-03-01" }),
    ];
    const transactions = [
      makeTx({
        id: "t1",
        accountId: "cc1",
        date: "2026-01-20",
        amount: -10000,
      }),
    ];

    const result = computeMissingSettlements(
      accounts,
      transactions,
      "2026-02-28"
    );

    expect(result).toHaveLength(0);
  });

  it("emits nothing when a settlement already exists for that billing cycle", () => {
    const accounts = [makeGiro("giro1"), makeCc({ id: "cc1" })];
    // Existing auto-settlement credit on CC dated on settlementDay (15) of Feb
    const existingSettlement: Transaction = {
      id: "s1",
      accountId: "cc1",
      date: "2026-02-15",
      amount: 10000,
      description: "Auto-settlement",
      category: "Transfer",
      isAutoSettlement: true,
    };
    const transactions = [
      makeTx({
        id: "t1",
        accountId: "cc1",
        date: "2026-01-20",
        amount: -10000,
      }),
      existingSettlement,
    ];

    const result = computeMissingSettlements(
      accounts,
      transactions,
      "2026-02-28"
    );

    expect(result).toHaveLength(0);
  });

  it("settlement amount equals the absolute value of CC month M closing balance", () => {
    const accounts = [makeGiro("giro1"), makeCc({ id: "cc1" })];
    const transactions = [
      makeTx({
        id: "t1",
        accountId: "cc1",
        date: "2026-01-20",
        amount: -25000,
      }),
    ];

    const result = computeMissingSettlements(
      accounts,
      transactions,
      "2026-02-28"
    );

    expect(result[0].amount).toBe(25000);
  });

  it("settlement transfer date is settlementDay of month M+1, not month M", () => {
    const accounts = [
      makeGiro("giro1"),
      makeCc({ id: "cc1", settlementDay: 17, linkedSince: "2026-03-01" }),
    ];
    const transactions = [
      makeTx({ id: "t1", accountId: "cc1", date: "2026-03-10", amount: -8000 }),
    ];

    const result = computeMissingSettlements(
      accounts,
      transactions,
      "2026-04-30"
    );

    expect(result[0].date).toBe("2026-04-17");
  });

  it("emits one settlement per negative-balance month across multiple billing cycles", () => {
    // Jan: -5000 spending. Feb: -3000 more spending.
    // Virtual Jan settlement (+5000 on Feb 15) is included when computing Feb's closing balance.
    // Jan closing = -5000 → settlement of 5000 on Feb 15
    // Feb closing = -5000 [Jan] + 5000 [virtual Jan settlement] + (-3000) [Feb] = -3000 → settlement of 3000 on Mar 15
    const accounts = [makeGiro("giro1"), makeCc({ id: "cc1" })];
    const transactions = [
      makeTx({ id: "t1", accountId: "cc1", date: "2026-01-20", amount: -5000 }),
      makeTx({ id: "t2", accountId: "cc1", date: "2026-02-20", amount: -3000 }),
    ];

    const result = computeMissingSettlements(
      accounts,
      transactions,
      "2026-03-31"
    );

    expect(result).toHaveLength(2);
    expect(result[0].amount).toBe(5000);
    expect(result[0].date).toBe("2026-02-15");
    expect(result[1].amount).toBe(3000);
    expect(result[1].date).toBe("2026-03-15");
  });
});
