import { useState, useEffect, useCallback } from "react";
import type { AccountWithBalance } from "../../types/account";
import { API_BASE } from "../../utils/api";

interface UseAccountsResult {
  accounts: AccountWithBalance[];
  isLoading: boolean;
  error: string | null;
  refresh: () => void;
}

export function useAccounts(): UseAccountsResult {
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    fetch(`${API_BASE}/accounts`)
      .then((res) => {
        if (!res.ok) throw new Error(`Failed to fetch accounts: ${res.status}`);
        return res.json() as Promise<AccountWithBalance[]>;
      })
      .then((data) => {
        if (!cancelled) {
          setAccounts(data);
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
  }, [refreshKey]);

  const refresh = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  return { accounts, isLoading, error, refresh };
}
