import { describe, expect, it } from "vitest";
import { recurringHistory } from "./recurringHistory.js";
import type {
  Account,
  AccountKind,
  RecurringTransaction,
} from "../../storage/types.js";

// Amounts are integer cents, dates ISO strings.

function account(
  id: string,
  kind: AccountKind,
  anchorBalance: number,
  anchorDate: string
): Account {
  return {
    id,
    kind,
    name: id,
    anchorBalance,
    anchorDate,
    showInTrajectory: true,
  };
}

function rule(
  overrides: Partial<RecurringTransaction> &
    Pick<RecurringTransaction, "id" | "accountId" | "amount" | "dayOfMonth">
): RecurringTransaction {
  return {
    description: "Rule",
    category: "Income",
    frequency: "monthly",
    ...overrides,
  };
}

const giro = account("giro", "Girokonto", 500000, "2026-01-01");
const tagesgeld = account("tg", "Tagesgeld", 200000, "2026-01-01");

describe("recurringHistory — gated legs in (Anchor Date, through]", () => {
  const salary = rule({
    id: "salary",
    accountId: "giro",
    amount: 250000,
    dayOfMonth: 25,
  });

  it("sums every leg after the Anchor Date up to and including `through`", () => {
    expect(recurringHistory("giro", [giro], [salary], "2026-03-25")).toBe(
      750000
    );
  });

  it("excludes a leg later this month than `through`", () => {
    expect(recurringHistory("giro", [giro], [salary], "2026-03-10")).toBe(
      500000
    );
  });

  it("excludes a leg dated on the Anchor Date", () => {
    const anchoredOnPayday = account("giro", "Girokonto", 500000, "2026-01-25");

    expect(
      recurringHistory("giro", [anchoredOnPayday], [salary], "2026-03-31")
    ).toBe(500000);
  });

  it("counts an annual rule only in its month of year", () => {
    const bonus = rule({
      id: "bonus",
      accountId: "giro",
      amount: 120000,
      dayOfMonth: 1,
      frequency: "annual",
      monthOfYear: 3,
    });
    const anchored = account("giro", "Girokonto", 500000, "2025-01-01");

    expect(recurringHistory("giro", [anchored], [bonus], "2026-06-30")).toBe(
      240000
    );
  });

  it("sums a negative plain rule as a negative amount", () => {
    const rent = rule({
      id: "rent",
      accountId: "giro",
      amount: -90000,
      dayOfMonth: 3,
      category: "Housing",
    });

    expect(recurringHistory("giro", [giro], [rent], "2026-04-02")).toBe(
      -270000
    );
  });

  it("ignores rules that belong to other accounts", () => {
    const tgInterest = rule({
      id: "interest",
      accountId: "tg",
      amount: 1500,
      dayOfMonth: 1,
    });

    expect(
      recurringHistory("giro", [giro, tagesgeld], [tgInterest], "2026-06-30")
    ).toBe(0);
  });
});

describe("recurringHistory — transfers", () => {
  const saving = rule({
    id: "saving",
    accountId: "giro",
    amount: 30000,
    dayOfMonth: 5,
    category: "Transfer",
    linkedAccountId: "tg",
  });

  it("debits the source account", () => {
    expect(
      recurringHistory("giro", [giro, tagesgeld], [saving], "2026-03-31")
    ).toBe(-90000);
  });

  it("credits the destination account", () => {
    expect(
      recurringHistory("tg", [giro, tagesgeld], [saving], "2026-03-31")
    ).toBe(90000);
  });

  it("gates each side by its own account's Anchor Date", () => {
    const lateTg = account("tg", "Tagesgeld", 200000, "2026-02-10");

    expect(recurringHistory("tg", [giro, lateTg], [saving], "2026-03-31")).toBe(
      30000
    );
    expect(
      recurringHistory("giro", [giro, lateTg], [saving], "2026-03-31")
    ).toBe(-90000);
  });
});

describe("recurringHistory — Mortgage legs are capped at the remaining Restschuld", () => {
  const mortgage = account("haus", "Mortgage", 150000, "2026-01-01");
  const repayment = rule({
    id: "repay",
    accountId: "giro",
    amount: 100000,
    dayOfMonth: 1,
    category: "Transfer",
    linkedAccountId: "haus",
  });

  it("debits the paying account no more than the Restschuld, in date order", () => {
    // Feb 1: 100000, Mar 1: capped to 50000, Apr 1: nothing left.
    expect(
      recurringHistory("giro", [giro, mortgage], [repayment], "2026-04-30")
    ).toBe(-150000);
  });

  it("pays the Mortgage down to zero and no further", () => {
    expect(
      recurringHistory("haus", [giro, mortgage], [repayment], "2026-04-30")
    ).toBe(-150000);
  });

  it("caps a repayment stored with a negative sign the same way", () => {
    const negative = { ...repayment, amount: -100000 };

    expect(
      recurringHistory("giro", [giro, mortgage], [negative], "2026-04-30")
    ).toBe(-150000);
    expect(
      recurringHistory("haus", [giro, mortgage], [negative], "2026-04-30")
    ).toBe(-150000);
  });

  it("is uncapped while the Restschuld exceeds the payments", () => {
    expect(
      recurringHistory("haus", [giro, mortgage], [repayment], "2026-02-28")
    ).toBe(-100000);
  });
});

describe("recurringHistory — zero", () => {
  it("is zero with no rules", () => {
    expect(recurringHistory("giro", [giro], [], "2026-06-30")).toBe(0);
  });

  it("is zero when `through` is the Anchor Date", () => {
    const salary = rule({
      id: "salary",
      accountId: "giro",
      amount: 250000,
      dayOfMonth: 1,
    });

    expect(recurringHistory("giro", [giro], [salary], "2026-01-01")).toBe(0);
  });

  it("is zero when `through` is before the Anchor Date", () => {
    const salary = rule({
      id: "salary",
      accountId: "giro",
      amount: 250000,
      dayOfMonth: 1,
    });

    expect(recurringHistory("giro", [giro], [salary], "2025-10-31")).toBe(0);
  });
});
