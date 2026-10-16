import { describe, it, expect } from "vitest";
import {
  selectLiquidAccounts,
  selectTrackableAccounts,
} from "./accountKinds.js";
import type { AccountKind } from "../../storage/types.js";

const account = (id: string, kind: AccountKind) => ({ id, kind });

const ALL = [
  account("giro", "Girokonto"),
  account("tg", "Tagesgeld"),
  account("mort", "Mortgage"),
  account("cc", "CreditCard"),
  account("etf", "Investment"),
];

describe("selectLiquidAccounts", () => {
  it("keeps Girokonto and Tagesgeld accounts", () => {
    expect(selectLiquidAccounts(ALL).map((a) => a.id)).toEqual(["giro", "tg"]);
  });

  it("drops Mortgage, CreditCard and Investment accounts", () => {
    const others = ALL.filter((a) => a.id !== "giro" && a.id !== "tg");
    expect(selectLiquidAccounts(others)).toEqual([]);
  });

  it("preserves caller fields beyond kind on the result", () => {
    const accounts = [{ id: "giro", kind: "Girokonto" as const, color: "x" }];
    expect(selectLiquidAccounts(accounts)).toEqual(accounts);
  });
});

describe("selectTrackableAccounts", () => {
  it("keeps Girokonto, Tagesgeld and Investment accounts", () => {
    expect(selectTrackableAccounts(ALL).map((a) => a.id)).toEqual([
      "giro",
      "tg",
      "etf",
    ]);
  });

  it("drops Mortgage and CreditCard accounts", () => {
    const others = ALL.filter((a) => a.id === "mort" || a.id === "cc");
    expect(selectTrackableAccounts(others)).toEqual([]);
  });

  it("preserves caller fields beyond kind on the result", () => {
    const accounts = [{ id: "etf", kind: "Investment" as const, color: "x" }];
    expect(selectTrackableAccounts(accounts)).toEqual(accounts);
  });
});
