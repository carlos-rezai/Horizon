import { describe, expect, it } from "vitest";
import { balanceAt, knownSince } from "./balanceAnchor.js";
import type { Transaction } from "../../storage/types.js";

// ---------------------------------------------------------------------------
// Fixture: a Girokonto whose user knows its balance on 15 June 2026.
// The anchor is end of day, so the -3000 on 2026-06-15 is already inside it.
// Amounts in cents, dates ISO.
// ---------------------------------------------------------------------------

const anchor = { anchorBalance: 100000, anchorDate: "2026-06-15" };

const transactions = [
  { date: "2026-04-10", amount: -20000 },
  { date: "2026-05-20", amount: 50000 },
  { date: "2026-06-15", amount: -3000 },
  { date: "2026-06-20", amount: -10000 },
  { date: "2026-07-05", amount: 40000 },
];

describe("balanceAt", () => {
  it("is the Anchor Balance on the Anchor Date", () => {
    expect(balanceAt(anchor, transactions, "2026-06-15")).toBe(100000);
  });

  it("adds the transactions dated after the anchor, up to and including the date", () => {
    expect(balanceAt(anchor, transactions, "2026-06-19")).toBe(100000);
    expect(balanceAt(anchor, transactions, "2026-06-20")).toBe(90000);
    expect(balanceAt(anchor, transactions, "2026-06-30")).toBe(90000);
    expect(balanceAt(anchor, transactions, "2026-07-31")).toBe(130000);
  });

  it("subtracts the transactions between the date and the anchor for a date before it", () => {
    // 2026-05-31: undo only the anchor-day -3000
    expect(balanceAt(anchor, transactions, "2026-05-31")).toBe(103000);
    // 2026-05-20 is end of day: that day's +50000 is still in
    expect(balanceAt(anchor, transactions, "2026-05-20")).toBe(103000);
    // 2026-05-19: undo +50000 and -3000
    expect(balanceAt(anchor, transactions, "2026-05-19")).toBe(53000);
    expect(balanceAt(anchor, transactions, "2026-04-30")).toBe(53000);
  });

  it("absorbs a transaction dated exactly on the Anchor Date: it is never added on top", () => {
    expect(
      balanceAt(anchor, [{ date: "2026-06-15", amount: -3000 }], "2026-06-16")
    ).toBe(100000);
    expect(
      balanceAt(anchor, [{ date: "2026-06-15", amount: -3000 }], "2026-06-15")
    ).toBe(100000);
    // and before the anchor it is undone
    expect(
      balanceAt(anchor, [{ date: "2026-06-15", amount: -3000 }], "2026-06-14")
    ).toBe(103000);
  });

  it("stays flat before Known Since, at the balance before the oldest transaction", () => {
    // Known Since is 2026-04-10; before it every transaction up to the anchor
    // is undone: 100000 - (-20000 + 50000 - 3000) = 73000
    expect(balanceAt(anchor, transactions, "2026-04-09")).toBe(73000);
    expect(balanceAt(anchor, transactions, "2026-01-01")).toBe(73000);
    expect(balanceAt(anchor, transactions, "2020-12-31")).toBe(73000);
  });

  it("is the Anchor Balance on every date when there are no transactions", () => {
    expect(balanceAt(anchor, [], "2026-01-01")).toBe(100000);
    expect(balanceAt(anchor, [], "2026-06-15")).toBe(100000);
    expect(balanceAt(anchor, [], "2027-12-31")).toBe(100000);
  });

  it("counts a future-dated transaction only from its own date on", () => {
    const withFuture = [...transactions, { date: "2026-12-01", amount: 5000 }];

    expect(balanceAt(anchor, withFuture, "2026-10-16")).toBe(130000);
    expect(balanceAt(anchor, withFuture, "2026-11-30")).toBe(130000);
    expect(balanceAt(anchor, withFuture, "2026-12-01")).toBe(135000);
    expect(balanceAt(anchor, withFuture, "2026-12-31")).toBe(135000);
  });

  it("does not depend on the order the transactions are given in", () => {
    const shuffled = [...transactions].reverse();

    expect(balanceAt(anchor, shuffled, "2026-05-19")).toBe(53000);
    expect(balanceAt(anchor, shuffled, "2026-07-31")).toBe(130000);
  });
});

// ---------------------------------------------------------------------------
// knownSince
// ---------------------------------------------------------------------------

function tx(
  overrides: Partial<Transaction> & { date: string; amount: number }
): Transaction {
  return {
    id: `tx-${overrides.date}`,
    accountId: "giro",
    description: "Row",
    category: "Miscellaneous",
    ...overrides,
  };
}

describe("knownSince", () => {
  it("is the Anchor Date when the anchor is earlier than every transaction", () => {
    const later: Transaction[] = [
      tx({ date: "2026-07-01", amount: 1000 }),
      tx({ date: "2026-08-01", amount: -500 }),
    ];

    expect(knownSince(anchor, later)).toBe("2026-06-15");
  });

  it("is the Anchor Date when there are no transactions", () => {
    expect(knownSince(anchor, [])).toBe("2026-06-15");
  });

  it("is the oldest transaction's date when a transaction is earlier than the anchor", () => {
    expect(knownSince(anchor, transactions)).toBe("2026-04-10");
  });

  it("is the oldest transaction's date regardless of input order", () => {
    expect(knownSince(anchor, [...transactions].reverse())).toBe("2026-04-10");
  });

  const imported = tx({ date: "2025-11-03", amount: -4500, importId: "imp1" });
  const manual = tx({ date: "2025-11-02", amount: -1200 });
  const settlement = tx({
    date: "2025-11-01",
    amount: -30000,
    transferId: "tr1",
    isAutoSettlement: true,
  });

  it.each([
    ["an imported row", imported, [manual, settlement]],
    ["a manual transaction", manual, [imported, settlement]],
    ["a settlement transfer leg", settlement, [imported, manual]],
  ])(
    "counts every source: %s that is the oldest sets Known Since",
    (_label, oldest, others) => {
      const later = others.map((o) => ({ ...o, date: "2026-01-15" }));
      const all: Transaction[] = [...later, oldest];

      expect(knownSince(anchor, all)).toBe(oldest.date);
    }
  );

  it("takes the oldest across a mix of import, manual and settlement rows", () => {
    expect(knownSince(anchor, [imported, manual, settlement])).toBe(
      "2025-11-01"
    );
  });
});
