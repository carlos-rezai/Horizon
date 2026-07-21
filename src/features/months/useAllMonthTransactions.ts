import { useCachedResource } from "../../components/CacheProvider/useCachedResource";
import type { Transaction } from "../../types/transaction";
import { API_BASE } from "../../utils/api/api";
import { monthTransactionsKey } from "./monthTransactionsKey";

interface UseAllMonthTransactionsResult {
  transactions: Transaction[];
  isLoading: boolean;
  refetch: () => void;
}

/**
 * Stable identity for the not-yet-loaded case, so consumers never see a fresh
 * array on every render.
 */
const NO_TRANSACTIONS: Transaction[] = [];

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
  const { data, isLoading, refresh } = useCachedResource<Transaction[]>(
    monthTransactionsKey(accountIds, month),
    () => fetchAllMonthTransactions(accountIds, month)
  );

  return {
    transactions: data ?? NO_TRANSACTIONS,
    isLoading,
    refetch: refresh,
  };
}
