import type { AccountKind } from "../../storage/types.js";

/**
 * The server-side home for the account-kind selections: which accounts are
 * liquid, and which are Trackable Accounts.
 *
 * Liquid accounts (Girokonto, Tagesgeld) make up Total Liquid. Trackable
 * Accounts add Investment to them: the accounts a "save X per month" target
 * fits, and the ones the Savings Streak counts.
 *
 * Parity contract: the liquid rule must stay in step with the client's
 * `LIQUID_KINDS` in `src/utils/accounts`, and the Trackable rule with the
 * Savings Streak's `TRACKABLE_KINDS` in `src/features/savings`. `src/` and
 * `server/src/` are separate build targets and cannot import one another, so
 * the rules are deliberately duplicated — keep both copies aligned when either
 * changes.
 */

const LIQUID_KINDS: ReadonlySet<AccountKind> = new Set([
  "Girokonto",
  "Tagesgeld",
]);

const TRACKABLE_KINDS: ReadonlySet<AccountKind> = new Set([
  "Girokonto",
  "Tagesgeld",
  "Investment",
]);

/**
 * Keep only the liquid accounts — Girokonto and Tagesgeld. Generic so callers
 * retain whatever extra fields (e.g. `id`) they need off the result.
 */
export function selectLiquidAccounts<T extends { kind: AccountKind }>(
  accounts: T[]
): T[] {
  return accounts.filter((a) => LIQUID_KINDS.has(a.kind));
}

/**
 * Keep only the Trackable Accounts — Girokonto, Tagesgeld and Investment.
 * Generic so callers retain whatever extra fields they need off the result.
 */
export function selectTrackableAccounts<T extends { kind: AccountKind }>(
  accounts: T[]
): T[] {
  return accounts.filter((a) => TRACKABLE_KINDS.has(a.kind));
}
