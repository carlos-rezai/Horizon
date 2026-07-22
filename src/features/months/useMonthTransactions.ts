import { useCachedResource } from "../../components/CacheProvider/useCachedResource";
import type { Transaction } from "../../types/transaction";
import { API_BASE } from "../../utils/api/api";
import {
  optimisticCreate,
  optimisticRemove,
  optimisticUpdate,
} from "../../utils/optimisticTransactions/optimisticTransactions";
import { monthTransactionsKey } from "./monthTransactionsKey";
import {
  noRow,
  provisionalId,
  storedRow,
  useOptimisticCommit,
} from "./useOptimisticCommit";

interface CreatePayload {
  date: string;
  amount: number;
  description: string;
  category: string;
}

interface UpdatePayload {
  date: string;
  amount: number;
  description: string;
  category: string;
}

interface UseMonthTransactionsResult {
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  create: (payload: CreatePayload) => Promise<void>;
  update: (id: string, payload: UpdatePayload) => Promise<void>;
  remove: (id: string) => Promise<void>;
  removeTransfer: (transferId: string) => Promise<void>;
  refetch: () => void;
}

/**
 * Stable identity for the not-yet-loaded case, so consumers never see a fresh
 * array on every render.
 */
const NO_TRANSACTIONS: Transaction[] = [];

const JSON_HEADERS = { "Content-Type": "application/json" };

async function fetchMonthTransactions(
  accountId: string,
  month: string
): Promise<Transaction[]> {
  // No account selected yet — there is nothing to ask the server for.
  if (!accountId) return NO_TRANSACTIONS;

  const res = await fetch(
    `${API_BASE}/accounts/${accountId}/transactions?month=${month}`
  );
  if (!res.ok) throw new Error(`Failed to fetch transactions: ${res.status}`);
  return (await res.json()) as Transaction[];
}

export function useMonthTransactions(
  accountId: string,
  month: string
): UseMonthTransactionsResult {
  const { data, isLoading, error, refresh, setData } = useCachedResource<
    Transaction[]
  >(monthTransactionsKey([accountId], month), () =>
    fetchMonthTransactions(accountId, month)
  );
  const commit = useOptimisticCommit(setData);

  const transactions = data ?? NO_TRANSACTIONS;

  async function create(payload: CreatePayload): Promise<void> {
    const provisional: Transaction = {
      id: provisionalId(),
      accountId,
      ...payload,
    };

    await commit(
      optimisticCreate(transactions, provisional),
      () =>
        fetch(`${API_BASE}/accounts/${accountId}/transactions`, {
          method: "POST",
          headers: JSON_HEADERS,
          body: JSON.stringify(payload),
        }),
      storedRow,
      "Failed to create transaction"
    );
  }

  async function update(id: string, payload: UpdatePayload): Promise<void> {
    await commit(
      optimisticUpdate(transactions, id, payload),
      () =>
        fetch(`${API_BASE}/transactions/${id}`, {
          method: "PATCH",
          headers: JSON_HEADERS,
          body: JSON.stringify(payload),
        }),
      storedRow,
      "Failed to update transaction"
    );
  }

  async function remove(id: string): Promise<void> {
    await commit(
      optimisticRemove(transactions, id),
      () => fetch(`${API_BASE}/transactions/${id}`, { method: "DELETE" }),
      noRow,
      "Failed to delete transaction"
    );
  }

  async function removeTransfer(transferId: string): Promise<void> {
    // Both legs go at once, so the list is rebuilt rather than edited.
    const rollback = transactions;
    const next = transactions.filter((tx) => tx.transferId !== transferId);

    await commit(
      { next, rollback, settle: () => next },
      () => fetch(`${API_BASE}/transfers/${transferId}`, { method: "DELETE" }),
      noRow,
      "Failed to delete transfer"
    );
  }

  return {
    transactions,
    isLoading,
    error,
    create,
    update,
    remove,
    removeTransfer,
    refetch: refresh,
  };
}
