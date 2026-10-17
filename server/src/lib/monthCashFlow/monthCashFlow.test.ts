import { describe, expect, it } from "vitest";
import { deriveMonthCashFlow } from "./monthCashFlow.js";
import {
  projectMonths,
  toProjectionAccountEntry,
  toProjectionRecurringEntry,
  toProjectionTxEntry,
} from "../projection/projection.js";
import type {
  Account,
  AccountKind,
  RecurringTransaction,
  Transaction,
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
  return deriveMonthCashFlow(
    month,
    projected,
    accounts,
    recurrings,
    [],
    "2026-03"
  );
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

// ─────────────────────────────────────────────────────────────
// Issue #253 — honest around the anchor
// ─────────────────────────────────────────────────────────────

// Giro is anchored on 15 Mar, Savings on 10 Mar, Cash has no anchor. The run
// starts in January, so February lies before the anchor month and March is
// the anchor month itself.
function anchoredAccount(
  id: string,
  kind: AccountKind,
  anchorDate: string,
  anchorBalance = 0
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

const anchorAccounts: Account[] = [
  anchoredAccount("cash", "Girokonto", "", 100000),
  anchoredAccount("giro", "Girokonto", "2026-03-15", 500000),
  anchoredAccount("savings", "Tagesgeld", "2026-03-10"),
];

const anchorRules: RecurringTransaction[] = [
  rule("rent", {
    amount: -100000,
    description: "Rent",
    category: "Housing",
    dayOfMonth: 1,
  }),
  rule("save", {
    amount: 20000,
    description: "Savings plan",
    category: "Transfer",
    dayOfMonth: 3,
    linkedAccountId: "savings",
  }),
  rule("topup", {
    amount: 5000,
    description: "Top-up",
    category: "Transfer",
    dayOfMonth: 12,
    linkedAccountId: "savings",
  }),
  rule("salary", {
    amount: 300000,
    description: "Salary",
    category: "Income",
    dayOfMonth: 25,
  }),
  rule("pocket", {
    accountId: "cash",
    amount: 10000,
    description: "Pocket money",
    category: "Transfer",
    dayOfMonth: 1,
    linkedAccountId: "giro",
  }),
  rule("cashfee", {
    accountId: "cash",
    amount: -500,
    description: "Cash fee",
    dayOfMonth: 5,
  }),
];

function anchorFlowsOf(month: string, accountId: string) {
  const projected = projectMonths(
    anchorAccounts.map(toProjectionAccountEntry),
    [],
    anchorRules.map(toProjectionRecurringEntry),
    "2026-01",
    "2026-01",
    6
  );
  return (
    deriveMonthCashFlow(
      month,
      projected,
      anchorAccounts,
      anchorRules,
      [],
      "2026-01"
    ).accounts.find((g) => g.accountId === accountId)?.flows ?? []
  );
}

describe("deriveMonthCashFlow — honest around the anchor", () => {
  it("lists a leg the Anchor Gate blocks in the anchor month as In Balance Anchor", () => {
    expect(anchorFlowsOf("2026-03", "giro")).toContainEqual({
      kind: "recurring",
      recurringId: "rent",
      date: "2026-03-01",
      description: "Rent",
      category: "Housing",
      amount: -100000,
      inAnchor: true,
    });
  });

  it("lists both blocked legs of a transfer, each signed for its own account", () => {
    expect(anchorFlowsOf("2026-03", "giro")).toContainEqual(
      expect.objectContaining({
        recurringId: "save",
        date: "2026-03-03",
        amount: -20000,
        counterpartId: "savings",
        side: "source",
        inAnchor: true,
      })
    );
    expect(anchorFlowsOf("2026-03", "savings")).toContainEqual(
      expect.objectContaining({
        recurringId: "save",
        date: "2026-03-03",
        amount: 20000,
        counterpartId: "giro",
        side: "destination",
        inAnchor: true,
      })
    );
  });

  it("gates each transfer leg against its own account's Anchor Date", () => {
    // 12 Mar: on or before Giro's 15 Mar anchor, after Savings' 10 Mar one.
    expect(anchorFlowsOf("2026-03", "giro")).toContainEqual(
      expect.objectContaining({
        recurringId: "topup",
        amount: -5000,
        side: "source",
        inAnchor: true,
      })
    );
    expect(anchorFlowsOf("2026-03", "savings")).toContainEqual(
      expect.objectContaining({
        recurringId: "topup",
        amount: 5000,
        side: "destination",
        inAnchor: false,
      })
    );
  });

  it("keeps a leg after the Anchor Date in the anchor month as a normal row", () => {
    const giro = anchorFlowsOf("2026-03", "giro");

    expect(giro).toContainEqual(
      expect.objectContaining({
        recurringId: "salary",
        date: "2026-03-25",
        amount: 300000,
        inAnchor: false,
      })
    );
    expect(giro).toHaveLength(5);
    expect(giro.filter((f) => f.inAnchor)).toHaveLength(4);
    const dates = giro.map((f) => f.date);
    expect(dates).toEqual([...dates].sort());
  });

  it("lists blocked legs from the anchor month on, never before it", () => {
    expect(anchorFlowsOf("2026-02", "giro")).toEqual([]);
    expect(anchorFlowsOf("2026-02", "savings")).toEqual([]);
    expect(anchorFlowsOf("2026-03", "giro").some((f) => f.inAnchor)).toBe(true);
  });

  it("leaves an account without an anchor unaffected, even when its transfer lands in an anchor month", () => {
    for (const month of ["2026-02", "2026-03"]) {
      expect(anchorFlowsOf(month, "cash")).toEqual([
        expect.objectContaining({
          recurringId: "pocket",
          date: `${month}-01`,
          amount: -10000,
          side: "source",
          inAnchor: false,
        }),
        expect.objectContaining({
          recurringId: "cashfee",
          date: `${month}-05`,
          amount: -500,
          inAnchor: false,
        }),
      ]);
    }
    expect(anchorFlowsOf("2026-03", "giro")).toContainEqual(
      expect.objectContaining({
        recurringId: "pocket",
        date: "2026-03-01",
        amount: 10000,
        counterpartId: "cash",
        side: "destination",
        inAnchor: true,
      })
    );
  });
});

// ---------------------------------------------------------------------------
// CreditCard settlement rows
// ---------------------------------------------------------------------------

// The current month is April. Visa settles on the 17th from Giro. Its card
// spending: €40.00 in February, €25.00 in March, €10.00 in April. The February
// and March cycles are settled by stored auto-settlements on 17 March (€40.00)
// and 17 April (€25.00); April's €10.00 is settled on 17 May only in the
// projection, after which the card stands at zero.
const settleAccounts: Account[] = [
  { ...account("giro", "Girokonto", 500000) },
  {
    ...account("visa", "CreditCard"),
    linkedAccountId: "giro",
    settlementDay: 17,
    linkedSince: "2026-02-15",
  },
];

const settleRules: RecurringTransaction[] = [
  rule("rent", {
    amount: -50000,
    description: "Rent",
    category: "Housing",
    dayOfMonth: 1,
  }),
];

function tx(
  id: string,
  accountId: string,
  date: string,
  amount: number,
  overrides: Partial<Transaction> = {}
): Transaction {
  return {
    id,
    accountId,
    date,
    amount,
    description: "Card purchase",
    category: "Food",
    ...overrides,
  };
}

function storedSettlement(id: string, date: string, amount: number) {
  const settlement = {
    description: "Auto-settlement",
    category: "Transfer",
    transferId: id,
    isAutoSettlement: true,
  };
  return [
    tx(`${id}-giro`, "giro", date, -amount, settlement),
    tx(`${id}-visa`, "visa", date, amount, settlement),
  ];
}

const settleTransactions: Transaction[] = [
  tx("feb", "visa", "2026-02-20", -4000),
  tx("mar", "visa", "2026-03-05", -2500),
  tx("apr", "visa", "2026-04-08", -1000),
  ...storedSettlement("s-mar", "2026-03-17", 4000),
  ...storedSettlement("s-apr", "2026-04-17", 2500),
];

function settleFlowsOf(month: string, accountId: string) {
  // A run from February, as History's run from the History Span's start.
  const projected = projectMonths(
    settleAccounts.map(toProjectionAccountEntry),
    settleTransactions.map(toProjectionTxEntry),
    settleRules.map(toProjectionRecurringEntry),
    "2026-02",
    "2026-04",
    5
  );
  return (
    deriveMonthCashFlow(
      month,
      projected,
      settleAccounts,
      settleRules,
      settleTransactions,
      "2026-04"
    ).accounts.find((g) => g.accountId === accountId)?.flows ?? []
  );
}

const settlementRows = (flows: ReturnType<typeof settleFlowsOf>) =>
  flows.filter((f) => f.kind === "settlement");

describe("deriveMonthCashFlow — CreditCard settlement rows", () => {
  it("lists a past month's stored settlement once on the funding account and once on the card, with opposite signs", () => {
    expect(settlementRows(settleFlowsOf("2026-03", "giro"))).toEqual([
      expect.objectContaining({
        kind: "settlement",
        date: "2026-03-17",
        description: "Auto-settlement",
        amount: -4000,
        counterpartId: "visa",
        inAnchor: false,
      }),
    ]);
    expect(settlementRows(settleFlowsOf("2026-03", "visa"))).toEqual([
      expect.objectContaining({
        kind: "settlement",
        date: "2026-03-17",
        description: "Auto-settlement",
        amount: 4000,
        counterpartId: "giro",
        inAnchor: false,
      }),
    ]);
  });

  it("lists the current month's stored settlement, not the engine's", () => {
    expect(settlementRows(settleFlowsOf("2026-04", "giro"))).toEqual([
      expect.objectContaining({ date: "2026-04-17", amount: -2500 }),
    ]);
    expect(settlementRows(settleFlowsOf("2026-04", "visa"))).toEqual([
      expect.objectContaining({ date: "2026-04-17", amount: 2500 }),
    ]);
  });

  it("orders a settlement row by date among the account's recurring rows", () => {
    expect(
      settleFlowsOf("2026-04", "giro").map((f) => [f.kind, f.date])
    ).toEqual([
      ["recurring", "2026-04-01"],
      ["settlement", "2026-04-17"],
    ]);
  });

  it("lists a future month's settlement as the engine projects it, on its Settlement Day, and none once the card is at zero", () => {
    expect(settlementRows(settleFlowsOf("2026-05", "giro"))).toEqual([
      expect.objectContaining({
        kind: "settlement",
        date: "2026-05-17",
        description: "Auto-settlement",
        amount: -1000,
        counterpartId: "visa",
        inAnchor: false,
      }),
    ]);
    expect(settlementRows(settleFlowsOf("2026-05", "visa"))).toEqual([
      expect.objectContaining({
        kind: "settlement",
        date: "2026-05-17",
        amount: 1000,
        counterpartId: "giro",
      }),
    ]);
    expect(settlementRows(settleFlowsOf("2026-06", "giro"))).toEqual([]);
    expect(settlementRows(settleFlowsOf("2026-06", "visa"))).toEqual([]);
  });
});
