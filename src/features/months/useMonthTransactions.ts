import { useState, useEffect } from "react";
import type { Transaction } from "../../types/transaction";
import { API_BASE } from "../../utils/api/api";

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
}

export function useMonthTransactions(
  accountId: string,
  month: string
): UseMonthTransactionsResult {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    fetch(`${API_BASE}/accounts/${accountId}/transactions?month=${month}`)
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
  }, [accountId, month]);

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

  async function update(id: string, payload: UpdatePayload): Promise<void> {
    const res = await fetch(`${API_BASE}/transactions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      throw new Error(data.error ?? "Failed to update transaction");
    }

    const updated = (await res.json()) as Transaction;
    setTransactions((prev) => prev.map((tx) => (tx.id === id ? updated : tx)));
  }

  async function remove(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/transactions/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      throw new Error(data.error ?? "Failed to delete transaction");
    }

    setTransactions((prev) => prev.filter((tx) => tx.id !== id));
  }

  async function removeTransfer(transferId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/transfers/${transferId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      throw new Error(data.error ?? "Failed to delete transfer");
    }

    setTransactions((prev) =>
      prev.filter((tx) => tx.transferId !== transferId)
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
  };
}
