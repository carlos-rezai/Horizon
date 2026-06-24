import { describe, it, expect } from "vitest";
import {
  isVariableSpending,
  selectSpendingAccounts,
} from "./variableSpending.js";
import type { AccountKind } from "../../storage/types.js";

describe("isVariableSpending", () => {
  it("includes a plain one-off expense", () => {
    expect(isVariableSpending({})).toBe(true);
  });

  it("excludes a transfer leg", () => {
    expect(isVariableSpending({ transferId: "transfer-1" })).toBe(false);
  });

  it("excludes a credit-card auto-settlement movement", () => {
    expect(isVariableSpending({ isAutoSettlement: true })).toBe(false);
  });
});

describe("selectSpendingAccounts", () => {
  const account = (id: string, kind: AccountKind) => ({ id, kind });

  it("keeps Girokonto, Tagesgeld and CreditCard accounts", () => {
    const accounts = [
      account("a", "Girokonto"),
      account("b", "Tagesgeld"),
      account("c", "CreditCard"),
    ];
    expect(selectSpendingAccounts(accounts).map((a) => a.id)).toEqual([
      "a",
      "b",
      "c",
    ]);
  });

  it("drops Mortgage and Investment accounts", () => {
    const accounts = [
      account("giro", "Girokonto"),
      account("mort", "Mortgage"),
      account("etf", "Investment"),
    ];
    expect(selectSpendingAccounts(accounts).map((a) => a.id)).toEqual(["giro"]);
  });

  it("preserves caller fields beyond kind on the result", () => {
    const accounts = [
      { id: "x", kind: "Girokonto" as AccountKind, name: "Main" },
    ];
    expect(selectSpendingAccounts(accounts)[0].name).toBe("Main");
  });
});
