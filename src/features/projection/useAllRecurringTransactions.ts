import { useState, useEffect } from "react";
import type { RecurringTransaction } from "../../types/recurring";
import { API_BASE } from "../../utils/api";

interface UseAllRecurringTransactionsResult {
  recurringTransactions: RecurringTransaction[];
  isLoading: boolean;
  error: string | null;
}

export function useAllRecurringTransactions(): UseAllRecurringTransactionsResult {
  const [recurringTransactions, setRecurringTransactions] = useState<
    RecurringTransaction[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(`${API_BASE}/recurring-transactions`)
      .then((res) => {
        if (!res.ok)
          throw new Error(
            `Failed to fetch recurring transactions: ${res.status}`
          );
        return res.json() as Promise<RecurringTransaction[]>;
      })
      .then((data) => {
        if (!cancelled) {
          setRecurringTransactions(data);
          setIsLoading(false);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Unknown error");
          setIsLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return { recurringTransactions, isLoading, error };
}
