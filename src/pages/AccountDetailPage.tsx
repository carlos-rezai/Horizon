import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAccounts } from "../features/accounts/useAccounts";
import AccountDetailHeader from "../features/accounts/AccountDetailHeader/AccountDetailHeader";
import { API_BASE } from "../utils/api";
import type { Transaction } from "../types/transaction";

export default function AccountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { accounts, isLoading, error } = useAccounts();
  const navigate = useNavigate();
  const [hasTransactions, setHasTransactions] = useState(false);

  useEffect(() => {
    if (!id) return;
    fetch(`${API_BASE}/accounts/${id}/transactions`)
      .then((r) => r.json() as Promise<Transaction[]>)
      .then((txs) => setHasTransactions(txs.length > 0))
      .catch(() => {});
  }, [id]);

  if (isLoading) return <p>Loading…</p>;
  if (error) return <p>Error: {error}</p>;

  const account = accounts.find((a) => a._id === id);
  if (!account) return <p>Account not found.</p>;

  const handleRename = async (name: string) => {
    const res = await fetch(`${API_BASE}/accounts/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name }),
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      throw new Error(data.error ?? "Failed to rename account");
    }
  };

  const handleDelete = async () => {
    const res = await fetch(`${API_BASE}/accounts/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      throw new Error(data.error ?? "Failed to delete account");
    }
    navigate("/");
  };

  return (
    <main>
      <AccountDetailHeader
        account={account}
        hasTransactions={hasTransactions}
        onRename={handleRename}
        onDelete={handleDelete}
      />
      <section>
        <h2>Transactions</h2>
        {/* Implemented in issue #16 */}
      </section>
      <section>
        <h2>Recurring Transactions</h2>
        {/* Implemented in issue #20 */}
      </section>
    </main>
  );
}
