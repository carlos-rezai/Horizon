import { useCachedResource } from "../../components/CacheProvider/useCachedResource";
import type { RecurringTransaction } from "../../types/recurring";
import { API_BASE } from "../../utils/api/api";

interface UseAllRecurringTransactionsResult {
  recurringTransactions: RecurringTransaction[];
  isLoading: boolean;
  error: string | null;
}

/**
 * Stable identity for the not-yet-loaded case, so consumers never see a fresh
 * array on every render.
 */
const NO_RECURRING: RecurringTransaction[] = [];

async function fetchAllRecurringTransactions(): Promise<
  RecurringTransaction[]
> {
  const res = await fetch(`${API_BASE}/recurring-transactions`);
  if (!res.ok) {
    throw new Error(`Failed to fetch recurring transactions: ${res.status}`);
  }
  return (await res.json()) as RecurringTransaction[];
}

export function useAllRecurringTransactions(): UseAllRecurringTransactionsResult {
  const { data, isLoading, error } = useCachedResource(
    "recurring",
    fetchAllRecurringTransactions
  );

  return {
    recurringTransactions: data ?? NO_RECURRING,
    isLoading,
    error,
  };
}
