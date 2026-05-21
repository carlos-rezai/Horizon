import { useState, useEffect } from "react";
import type { Transaction } from "../../types/transaction";
import { API_BASE } from "../../utils/api/api";

interface UseAllMonthTransactionsResult {
  transactions: Transaction[];
  isLoading: boolean;
  refetch: () => void;
}

export function useAllMonthTransactions(
  accountIds: string[],
  month: string
): UseAllMonthTransactionsResult {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(accountIds.length > 0);
  const [fetchKey, setFetchKey] = useState(0);

  const accountIdsKey = accountIds.join(",");

  useEffect(() => {
    if (accountIds.length === 0) {
      setTransactions([]);
      setIsLoading(false);
      return;
    }

    let cancelled = false;
    setIsLoading(true);

    Promise.all(
      accountIds.map((id) =>
        fetch(`${API_BASE}/accounts/${id}/transactions?month=${month}`).then(
          (res) => res.json() as Promise<Transaction[]>
        )
      )
    ).then((results) => {
      if (!cancelled) {
        setTransactions(results.flat());
        setIsLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accountIdsKey, month, fetchKey]);

  function refetch() {
    setFetchKey((k) => k + 1);
  }

  return { transactions, isLoading, refetch };
}
