import type { AccountWithBalance } from "../types/account";

const LIQUID_KINDS = new Set(["Girokonto", "Tagesgeld"]);

export function computeTotalLiquid(accounts: AccountWithBalance[]): number {
  return accounts
    .filter((a) => LIQUID_KINDS.has(a.kind))
    .reduce((sum, a) => sum + a.balance, 0);
}
