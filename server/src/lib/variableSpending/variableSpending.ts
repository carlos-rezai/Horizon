import type { AccountKind } from "../../storage/types.js";

/**
 * The server-side home for the Variable-Spending rule, used by `/reports`
 * aggregations.
 *
 * Variable Spending is the only category of actual transaction in the
 * Recurring-Only model: one-off transfer legs and credit-card auto-settlement
 * are bookkeeping movements, not spending, and Mortgage / Investment accounts
 * never hold spending at all.
 *
 * Parity contract: the transaction-level half of this rule must stay in step
 * with the client's `selectVariableSpending` in `src/utils/monthStats`
 * (`!transferId && !isAutoSettlement`). `src/` and `server/src/` are separate
 * build targets and cannot import one another, so the rule is deliberately
 * duplicated — keep both copies aligned when either changes.
 */

/** Account kinds that never hold variable spending. */
const NON_SPENDING_KINDS: ReadonlySet<AccountKind> = new Set([
  "Mortgage",
  "Investment",
]);

/** Minimal transaction shape the Variable-Spending predicate inspects. */
interface SpendingTxLike {
  transferId?: string;
  isAutoSettlement?: boolean;
}

/**
 * True when a transaction is real variable spending — i.e. it is neither a
 * transfer leg nor a credit-card auto-settlement movement.
 */
export function isVariableSpending(tx: SpendingTxLike): boolean {
  return !tx.transferId && !tx.isAutoSettlement;
}

/**
 * Keep only the accounts whose kind can hold variable spending — drops
 * Mortgage and Investment accounts. Generic so callers retain whatever extra
 * fields (e.g. `id`) they need off the result.
 */
export function selectSpendingAccounts<T extends { kind: AccountKind }>(
  accounts: T[]
): T[] {
  return accounts.filter((a) => !NON_SPENDING_KINDS.has(a.kind));
}
