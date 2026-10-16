import { useState, useEffect } from "react";
import type {
  RecurringTransaction,
  RecurringTransactionInput,
} from "../../../types/recurring";
import { API_BASE } from "../../../utils/api/api";
import { apiErrorMessage } from "../../../utils/apiError/apiError";

interface UseRecurringTransactionsResult {
  recurringTransactions: RecurringTransaction[];
  isLoading: boolean;
  error: string | null;
  create: (payload: RecurringTransactionInput) => Promise<void>;
  update: (id: string, payload: RecurringTransactionInput) => Promise<void>;
  remove: (id: string) => Promise<void>;
}

export function useRecurringTransactions(
  accountId: string
): UseRecurringTransactionsResult {
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
          setRecurringTransactions(
            data.filter(
              (rt) =>
                rt.accountId === accountId || rt.linkedAccountId === accountId
            )
          );
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

  async function create(payload: RecurringTransactionInput): Promise<void> {
    const res = await fetch(`${API_BASE}/recurring-transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(
        apiErrorMessage(
          await res.json(),
          "Failed to create recurring transaction"
        )
      );
    }

    const created = (await res.json()) as RecurringTransaction;
    setRecurringTransactions((prev) => [...prev, created]);
  }

  async function update(
    id: string,
    payload: RecurringTransactionInput
  ): Promise<void> {
    const res = await fetch(`${API_BASE}/recurring-transactions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      throw new Error(
        apiErrorMessage(
          await res.json(),
          "Failed to update recurring transaction"
        )
      );
    }

    const updated = (await res.json()) as RecurringTransaction;
    setRecurringTransactions((prev) =>
      prev.map((rt) => (rt.id === id ? updated : rt))
    );
  }

  async function remove(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/recurring-transactions/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      throw new Error(
        apiErrorMessage(
          await res.json(),
          "Failed to delete recurring transaction"
        )
      );
    }

    setRecurringTransactions((prev) => prev.filter((rt) => rt.id !== id));
  }

  return {
    recurringTransactions,
    isLoading,
    error,
    create,
    update,
    remove,
  };
}
