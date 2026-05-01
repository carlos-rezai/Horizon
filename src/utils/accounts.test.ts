import { describe, it, expect } from "vitest";
import { computeTotalLiquid } from "./accounts";

type AccountKind =
  | "Girokonto"
  | "Tagesgeld"
  | "Mortgage"
  | "CreditCard"
  | "Investment";
interface AccountWithBalance {
  id: string;
  kind: AccountKind;
  name: string;
  openingBalance: number;
  openingDate: string;
  balance: number;
  sondertilgungAllowance?: number;
}

const account = (kind: AccountKind, balance: number): AccountWithBalance => ({
  id: `id-${kind}`,
  kind,
  name: `${kind} account`,
  openingBalance: 0,
  openingDate: "2026-01-01",
  balance,
});

describe("computeTotalLiquid", () => {
  it("sums Girokonto and Tagesgeld balances", () => {
    const accounts = [
      account("Girokonto", 100000),
      account("Tagesgeld", 200000),
    ];
    expect(computeTotalLiquid(accounts)).toBe(300000);
  });

  it("excludes Mortgage, CreditCard, and Investment accounts", () => {
    const accounts = [
      account("Girokonto", 100000),
      account("Mortgage", 4000000),
      account("CreditCard", 50000),
      account("Investment", 300000),
    ];
    expect(computeTotalLiquid(accounts)).toBe(100000);
  });

  it("returns 0 when no accounts exist", () => {
    expect(computeTotalLiquid([])).toBe(0);
  });
});
