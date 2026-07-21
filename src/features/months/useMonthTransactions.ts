import { useCacheBump } from "../../components/CacheProvider/useCacheBump";
import { useCachedResource } from "../../components/CacheProvider/useCachedResource";
import type { Transaction } from "../../types/transaction";
import { API_BASE } from "../../utils/api/api";
import { monthTransactionsKey } from "./monthTransactionsKey";

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
  refetch: () => void;
}

/**
 * Stable identity for the not-yet-loaded case, so consumers never see a fresh
 * array on every render.
 */
const NO_TRANSACTIONS: Transaction[] = [];

async function fetchMonthTransactions(
  accountId: string,
  month: string
): Promise<Transaction[]> {
  // No account selected yet — there is nothing to ask the server for.
  if (!accountId) return NO_TRANSACTIONS;

  const res = await fetch(
    `${API_BASE}/accounts/${accountId}/transactions?month=${month}`
  );
  if (!res.ok) throw new Error(`Failed to fetch transactions: ${res.status}`);
  return (await res.json()) as Transaction[];
}

export function useMonthTransactions(
  accountId: string,
  month: string
): UseMonthTransactionsResult {
  const { data, isLoading, error, refresh, setData } = useCachedResource<
    Transaction[]
  >(monthTransactionsKey([accountId], month), () =>
    fetchMonthTransactions(accountId, month)
  );
  const bump = useCacheBump();

  /**
   * Every mutation here moves money, so the account balances and the whole
   * projection built on top of them are stale the moment it lands.
   */
  function bumpDependents(): void {
    bump("accounts", "projection");
  }

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
    setData((prev) => [...(prev ?? NO_TRANSACTIONS), created]);
    bumpDependents();
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
    setData((prev) =>
      (prev ?? NO_TRANSACTIONS).map((tx) => (tx.id === id ? updated : tx))
    );
    bumpDependents();
  }

  async function remove(id: string): Promise<void> {
    const res = await fetch(`${API_BASE}/transactions/${id}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      throw new Error(data.error ?? "Failed to delete transaction");
    }

    setData((prev) => (prev ?? NO_TRANSACTIONS).filter((tx) => tx.id !== id));
    bumpDependents();
  }

  async function removeTransfer(transferId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/transfers/${transferId}`, {
      method: "DELETE",
    });

    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      throw new Error(data.error ?? "Failed to delete transfer");
    }

    setData((prev) =>
      (prev ?? NO_TRANSACTIONS).filter((tx) => tx.transferId !== transferId)
    );
    bumpDependents();
  }

  return {
    transactions: data ?? NO_TRANSACTIONS,
    isLoading,
    error,
    create,
    update,
    remove,
    removeTransfer,
    refetch: refresh,
  };
}
