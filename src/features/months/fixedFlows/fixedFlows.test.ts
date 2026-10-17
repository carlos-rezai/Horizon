import { describe, it, expect } from "vitest";
import type {
  FixedFlow,
  RecurringFixedFlow,
  SettlementFixedFlow,
} from "../../../types/monthCashFlow";
import { netFixed, rowAccountId, statementHistoryBefore } from "./fixedFlows";

function recurring(overrides: Partial<RecurringFixedFlow>): RecurringFixedFlow {
  return {
    kind: "recurring",
    recurringId: "rule",
    date: "2026-09-01",
    description: "Rule",
    amount: 0,
    inAnchor: false,
    ...overrides,
  };
}

function settlement(
  overrides: Pick<SettlementFixedFlow, "amount" | "counterpartId" | "side">
): SettlementFixedFlow {
  return {
    kind: "settlement",
    date: "2026-09-15",
    description: "Auto-settlement",
    category: "Transfer",
    inAnchor: false,
    ...overrides,
  };
}

describe("netFixed", () => {
  it("sums every row", () => {
    const flows: FixedFlow[] = [
      recurring({ amount: 300000 }),
      recurring({ amount: -50000 }),
      settlement({ amount: -4000, counterpartId: "visa", side: "source" }),
    ];
    expect(netFixed(flows)).toBe(246000);
  });

  it("leaves out rows In Balance Anchor", () => {
    const flows = [
      recurring({ amount: 300000, inAnchor: true }),
      recurring({ amount: -50000 }),
    ];
    expect(netFixed(flows)).toBe(-50000);
  });

  it("is 0 for no rows", () => {
    expect(netFixed([])).toBe(0);
  });
});

describe("rowAccountId", () => {
  const main = { accountId: "main" };
  const tagesgeld = { accountId: "tg" };

  it("links a plain recurring row to its own account", () => {
    expect(rowAccountId(main, recurring({ amount: 300000 }))).toBe("main");
  });

  it("links a transfer's source row to its own account", () => {
    const flow = recurring({ counterpartId: "tg", side: "source" });
    expect(rowAccountId(main, flow)).toBe("main");
  });

  it("links a transfer's destination row to the rule's account", () => {
    const flow = recurring({ counterpartId: "main", side: "destination" });
    expect(rowAccountId(tagesgeld, flow)).toBe("main");
  });

  it("links a settlement row on the funding account to the CreditCard", () => {
    const flow = settlement({
      amount: -4000,
      counterpartId: "visa",
      side: "source",
    });
    expect(rowAccountId(main, flow)).toBe("visa");
  });

  it("links a settlement row on the CreditCard to the CreditCard", () => {
    const flow = settlement({
      amount: 4000,
      counterpartId: "main",
      side: "destination",
    });
    expect(rowAccountId({ accountId: "visa" }, flow)).toBe("visa");
  });
});

describe("statementHistoryBefore", () => {
  const account = { anchorDate: "2026-06-15" };

  it("gives the Anchor Date for a month before the Anchor month", () => {
    expect(statementHistoryBefore(account, "2026-05")).toBe("2026-06-15");
  });

  it("gives null for the Anchor month itself", () => {
    expect(statementHistoryBefore(account, "2026-06")).toBeNull();
  });

  it("gives null for a month after the Anchor month", () => {
    expect(statementHistoryBefore(account, "2026-07")).toBeNull();
  });

  it("gives null for an unknown account", () => {
    expect(statementHistoryBefore(undefined, "2026-05")).toBeNull();
  });
});
