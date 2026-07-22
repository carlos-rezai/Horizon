import type { Transaction } from "../../types/transaction";

/** The fields an edit may change on a row that already exists. */
export type TransactionChanges = Partial<Omit<Transaction, "id">>;

/**
 * One optimistic edit to a month's transaction list, as three plain lists:
 * what to paint now, what to restore if the server refuses, and what to hold
 * once the server's own row comes back.
 *
 * Nothing here touches React or the network — an edit is a value, so the hook
 * that owns the list can paint it, send the request, and pick the outcome.
 */
export interface OptimisticEdit {
  /** The list to paint immediately, before the request leaves. */
  next: Transaction[];
  /** The exact list the edit started from, restored when the server refuses. */
  rollback: Transaction[];
  /**
   * The list once the server has stored the row — the provisional row is
   * replaced in its own position, so nothing moves and no id goes stale.
   */
  settle: (stored: Transaction) => Transaction[];
}

/** Appends a row the server has not seen yet to the end of the list. */
export function optimisticCreate(
  list: Transaction[],
  provisional: Transaction
): OptimisticEdit {
  const next = [...list, provisional];

  return {
    next,
    rollback: [...list],
    settle: (stored) =>
      next.map((tx) => (tx.id === provisional.id ? stored : tx)),
  };
}

/** Paints changed fields onto the matching row without moving it. */
export function optimisticUpdate(
  list: Transaction[],
  id: string,
  changes: TransactionChanges
): OptimisticEdit {
  return {
    next: list.map((tx) => (tx.id === id ? { ...tx, ...changes } : tx)),
    rollback: [...list],
    settle: (stored) => list.map((tx) => (tx.id === id ? stored : tx)),
  };
}

/** Drops the matching row immediately. */
export function optimisticRemove(
  list: Transaction[],
  id: string
): OptimisticEdit {
  const next = list.filter((tx) => tx.id !== id);

  return {
    next,
    rollback: [...list],
    // A delete has nothing to reconcile — the row is already gone.
    settle: () => next,
  };
}
