import { useState, useEffect } from "react";
import type { AccountWithBalance } from "../types/account";

interface UseAccountsResult {
  accounts: AccountWithBalance[];
  isLoading: boolean;
  error: string | null;
}

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:3001";

export function useAccounts(): UseAccountsResult {
  const [accounts, setAccounts] = useState<AccountWithBalance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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
  }, []);

  return { accounts, isLoading, error };
}
