import { RECURRING } from "../../components/CacheProvider/cacheKeys";
import { useCachedResource } from "../../components/CacheProvider/useCachedResource";
import type { RecurringTransaction } from "../../types/recurring";
import { fetchJson } from "../../utils/api/fetchJson";

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

function fetchAllRecurringTransactions(): Promise<RecurringTransaction[]> {
  return fetchJson<RecurringTransaction[]>("/recurring-transactions");
}

export function useAllRecurringTransactions(): UseAllRecurringTransactionsResult {
  const { data, isLoading, error } = useCachedResource(
    RECURRING,
    fetchAllRecurringTransactions
  );

  return {
    recurringTransactions: data ?? NO_RECURRING,
    isLoading,
    error,
  };
}
