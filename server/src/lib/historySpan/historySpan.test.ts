import { describe, expect, it } from "vitest";
import { historySpanStart, mortgageStartMonth } from "./historySpan.js";

// ---------------------------------------------------------------------------
// The History Span runs from the earliest Known Since month across all
// accounts through the current month. Known Since is the earlier of an
// account's Anchor Date and its oldest transaction. Amounts in cents, dates
// ISO, months "YYYY-MM".
// ---------------------------------------------------------------------------

const CURRENT_MONTH = "2026-07";

describe("historySpanStart", () => {
  it("starts at the earliest Anchor Date when an anchor is the earliest fact", () => {
    const accounts = [
      { id: "giro", anchorBalance: 100000, anchorDate: "2026-04-01" },
      { id: "tagesgeld", anchorBalance: 500000, anchorDate: "2026-02-10" },
    ];
    const transactions = [
      { accountId: "giro", date: "2026-05-03", amount: -1000 },
      { accountId: "tagesgeld", date: "2026-06-12", amount: 2000 },
    ];

    expect(historySpanStart(accounts, transactions, CURRENT_MONTH)).toBe(
      "2026-02"
    );
  });

  it("starts at the oldest transaction when it predates every Anchor Date", () => {
    const accounts = [
      { id: "giro", anchorBalance: 100000, anchorDate: "2026-06-30" },
      { id: "tagesgeld", anchorBalance: 500000, anchorDate: "2026-05-01" },
    ];
    const transactions = [
      { accountId: "giro", date: "2026-03-20", amount: -1000 },
      { accountId: "giro", date: "2026-01-15", amount: -2000 },
    ];

    expect(historySpanStart(accounts, transactions, CURRENT_MONTH)).toBe(
      "2026-01"
    );
  });

  it("is the current month when the only Known Since falls in it", () => {
    const accounts = [
      { id: "giro", anchorBalance: 100000, anchorDate: "2026-07-05" },
    ];
    const transactions = [
      { accountId: "giro", date: "2026-07-10", amount: -1000 },
    ];

    expect(historySpanStart(accounts, transactions, CURRENT_MONTH)).toBe(
      CURRENT_MONTH
    );
  });

  // Paydown Bridge (issue #240): a Mortgage's origination reaches further back
  // than any Known Since, so its Mortgage Start month opens the span.
  it("starts at the Mortgage Start month when it predates every Known Since", () => {
    const accounts = [
      { id: "giro", anchorBalance: 100000, anchorDate: "2026-04-01" },
      {
        id: "haus",
        kind: "Mortgage" as const,
        anchorBalance: 30000000,
        anchorDate: "2026-07-01",
        originalPrincipal: 45000000,
        startDate: "2022-06-15",
      },
    ];
    const transactions = [
      { accountId: "giro", date: "2026-02-03", amount: -1000 },
    ];

    expect(historySpanStart(accounts, transactions, CURRENT_MONTH)).toBe(
      "2022-06"
    );
  });

  it("is the current month when there are no accounts", () => {
    expect(historySpanStart([], [], CURRENT_MONTH)).toBe(CURRENT_MONTH);
  });
});

describe("mortgageStartMonth", () => {
  it("gives the Mortgage Start month of an originated Mortgage", () => {
    expect(
      mortgageStartMonth({
        kind: "Mortgage",
        originalPrincipal: 45000000,
        startDate: "2023-01-15",
      })
    ).toBe("2023-01");
  });

  it("gives null for a Mortgage without a start date", () => {
    expect(
      mortgageStartMonth({ kind: "Mortgage", originalPrincipal: 45000000 })
    ).toBeNull();
  });

  it("gives null for a Mortgage without an Original Principal", () => {
    expect(
      mortgageStartMonth({ kind: "Mortgage", startDate: "2023-01-15" })
    ).toBeNull();
  });

  it("gives null for a Girokonto that carries a stray start date", () => {
    expect(
      mortgageStartMonth({
        kind: "Girokonto",
        originalPrincipal: 45000000,
        startDate: "2023-01-15",
      })
    ).toBeNull();
  });
});
