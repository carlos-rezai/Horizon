import { describe, it, expect } from "vitest";
import type { AccountWithBalance } from "../../types/account";
import { accountSubtitle } from "./accountSubtitle";

function acc(overrides: Partial<AccountWithBalance>): AccountWithBalance {
  return {
    id: "a",
    kind: "Girokonto",
    name: "Main",
    openingBalance: 0,
    openingDate: "2026-01-01",
    balance: 0,
    ...overrides,
  };
}

describe("accountSubtitle", () => {
  it("describes a Girokonto as a checking account", () => {
    expect(accountSubtitle(acc({ kind: "Girokonto" }), [])).toBe(
      "Checking account"
    );
  });

  it("describes a Tagesgeld as a savings account", () => {
    expect(accountSubtitle(acc({ kind: "Tagesgeld" }), [])).toBe(
      "Savings account"
    );
  });

  it("describes an Investment account", () => {
    expect(accountSubtitle(acc({ kind: "Investment" }), [])).toBe(
      "Investment account"
    );
  });

  it("describes a Mortgage as its Restschuld", () => {
    expect(accountSubtitle(acc({ kind: "Mortgage" }), [])).toBe(
      "Mortgage · Restschuld"
    );
  });

  it("names the funding account for a linked credit card", () => {
    const main = acc({ id: "main", kind: "Girokonto", name: "Main" });
    const visa = acc({
      id: "visa",
      kind: "CreditCard",
      name: "Visa",
      linkedAccountId: "main",
    });
    expect(accountSubtitle(visa, [main, visa])).toBe(
      "Credit card · settles monthly → Main"
    );
  });

  it("describes an unlinked credit card without a funding account", () => {
    expect(accountSubtitle(acc({ kind: "CreditCard" }), [])).toBe(
      "Credit card"
    );
  });
});
