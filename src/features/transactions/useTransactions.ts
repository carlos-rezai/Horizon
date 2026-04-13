import { useState, useEffect } from "react";
import type { Transaction } from "../../types/transaction";
import { API_BASE } from "../../utils/api";

interface CreatePayload {
  date: string;
  amount: number;
  description: string;
  category: string;
}

interface UseTransactionsResult {
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  create: (payload: CreatePayload) => Promise<void>;
}

export function useTransactions(accountId: string): UseTransactionsResult {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(`${API_BASE}/accounts/${accountId}/transactions`)
      .then((res) => {
        if (!res.ok)
          throw new Error(`Failed to fetch transactions: ${res.status}`);
        return res.json() as Promise<Transaction[]>;
      })
      .then((data) => {
        if (!cancelled) {
          setTransactions(data);
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
  }, [accountId]);

  async function create(payload: CreatePayload): Promise<void> {
    const res = await fetch(`${API_BASE}/accounts/${accountId}/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      throw new Error(data.error ?? "Failed to create transaction");
    }

    const created = (await res.json()) as Transaction;
    setTransactions((prev) => [...prev, created]);
  }

  return { transactions, isLoading, error, create };
}
