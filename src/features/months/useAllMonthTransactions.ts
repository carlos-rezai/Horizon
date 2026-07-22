import { useCachedResource } from "../../components/CacheProvider/useCachedResource";
import type { Transaction, TransactionDraft } from "../../types/transaction";
import { API_BASE } from "../../utils/api/api";
import {
  optimisticCreate,
  optimisticRemove,
  optimisticUpdate,
  type TransactionChanges,
} from "../../utils/optimisticTransactions/optimisticTransactions";
import { monthTransactionsKey } from "./monthTransactionsKey";
import {
  noRow,
  provisionalId,
  storedRow,
  useOptimisticCommit,
} from "./useOptimisticCommit";

interface UseAllMonthTransactionsResult {
  transactions: Transaction[];
  isLoading: boolean;
  /** Read failure message, so a failed month reads differently from an empty one. */
  error: string | null;
  refetch: () => void;
  create: (accountId: string, draft: TransactionDraft) => Promise<void>;
  update: (id: string, changes: TransactionChanges) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

/**
 * Stable identity for the not-yet-loaded case, so consumers never see a fresh
 * array on every render.
 */
const NO_TRANSACTIONS: Transaction[] = [];

const JSON_HEADERS = { "Content-Type": "application/json" };

async function fetchAllMonthTransactions(
  accountIds: readonly string[],
  month: string
): Promise<Transaction[]> {
  if (accountIds.length === 0) return NO_TRANSACTIONS;

  const perAccount = await Promise.all(
    accountIds.map((id) =>
      fetch(`${API_BASE}/accounts/${id}/transactions?month=${month}`).then(
        (res) => res.json() as Promise<Transaction[]>
      )
    )
  );

  return perAccount.flat();
}

export function useAllMonthTransactions(
  accountIds: string[],
  month: string
): UseAllMonthTransactionsResult {
  const { data, isLoading, error, refresh, setData } = useCachedResource<
    Transaction[]
  >(monthTransactionsKey(accountIds, month), () =>
    fetchAllMonthTransactions(accountIds, month)
  );
  const commit = useOptimisticCommit(setData);

  const transactions = data ?? NO_TRANSACTIONS;

  /**
   * A transfer writes two legs across two accounts, so there is no single row
   * to paint: the list stands as it is and picks the pair up on the next read.
   */
  async function createTransfer(
    fromAccountId: string,
    { toAccountId, ...draft }: TransactionDraft
  ): Promise<void> {
    const landed = await commit(
      {
        next: transactions,
        rollback: transactions,
        settle: () => transactions,
      },
      () =>
        fetch(`${API_BASE}/transfers`, {
          method: "POST",
          headers: JSON_HEADERS,
          body: JSON.stringify({ fromAccountId, toAccountId, ...draft }),
        }),
      noRow,
      "Failed to record the transfer"
    );

    if (landed) refresh();
  }

  async function create(
    accountId: string,
    draft: TransactionDraft
  ): Promise<void> {
    if (draft.toAccountId) return createTransfer(accountId, draft);

    const provisional: Transaction = {
      id: provisionalId(),
      accountId,
      date: draft.date,
      amount: draft.amount,
      description: draft.description,
      category: draft.category,
    };

    await commit(
      optimisticCreate(transactions, provisional),
      () =>
        fetch(`${API_BASE}/accounts/${accountId}/transactions`, {
          method: "POST",
          headers: JSON_HEADERS,
          body: JSON.stringify({
            date: draft.date,
            amount: draft.amount,
            description: draft.description,
            category: draft.category,
          }),
        }),
      storedRow,
      "Failed to record the expense"
    );
  }

  async function update(
    id: string,
    changes: TransactionChanges
  ): Promise<void> {
    await commit(
      optimisticUpdate(transactions, id, changes),
      () =>
        fetch(`${API_BASE}/transactions/${id}`, {
          method: "PATCH",
          headers: JSON_HEADERS,
          body: JSON.stringify(changes),
        }),
      storedRow,
      "Failed to update the transaction"
    );
  }

  async function remove(id: string): Promise<void> {
    await commit(
      optimisticRemove(transactions, id),
      () => fetch(`${API_BASE}/transactions/${id}`, { method: "DELETE" }),
      noRow,
      "Failed to delete the transaction"
    );
  }

  return {
    transactions,
    isLoading,
    error,
    refetch: refresh,
    create,
    update,
    remove,
  };
}
