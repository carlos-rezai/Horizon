import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAccounts } from "../features/accounts/useAccounts";
import AccountDetailHeader from "../features/accounts/AccountDetailHeader/AccountDetailHeader";
import TransactionCreateModal from "../features/transactions/TransactionCreateModal/TransactionCreateModal";
import TransferCreateModal from "../features/transactions/TransferCreateModal/TransferCreateModal";
import RecurringTransactionList from "../features/transactions/RecurringTransactionList/RecurringTransactionList";
import RecurringTransactionModal from "../features/transactions/RecurringTransactionModal/RecurringTransactionModal";
import { useRecurringTransactions } from "../features/transactions/useRecurringTransactions";
import { API_BASE } from "../utils/api";
import type { Transaction } from "../types/transaction";
import type { RecurringTransaction } from "../types/recurring";

export default function AccountDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { accounts, isLoading, error } = useAccounts();
  const {
    recurringTransactions,
    toggleIsActive,
    remove: removeRecurring,
    update: updateRecurring,
    create: createRecurring,
  } = useRecurringTransactions(id ?? "");
  const navigate = useNavigate();
  const [hasTransactions, setHasTransactions] = useState(false);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [showAddTransfer, setShowAddTransfer] = useState(false);
  const [showAddRecurring, setShowAddRecurring] = useState(false);
  const [editingRecurring, setEditingRecurring] =
    useState<RecurringTransaction | null>(null);

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
        <button type="button" onClick={() => setShowAddTransaction(true)}>
          Add transaction
        </button>
        <button type="button" onClick={() => setShowAddTransfer(true)}>
          Add transfer
        </button>
        {showAddTransaction && (
          <TransactionCreateModal
            accountId={account._id}
            onClose={() => setShowAddTransaction(false)}
            onSuccess={() => setShowAddTransaction(false)}
          />
        )}
        {showAddTransfer && (
          <TransferCreateModal
            fromAccountId={account._id}
            accounts={accounts}
            onClose={() => setShowAddTransfer(false)}
            onSuccess={() => setShowAddTransfer(false)}
          />
        )}
      </section>
      <section>
        <h2>Recurring Transactions</h2>
        <button type="button" onClick={() => setShowAddRecurring(true)}>
          Add recurring transaction
        </button>
        <RecurringTransactionList
          recurringTransactions={recurringTransactions}
          onToggle={(rt) => toggleIsActive(rt._id, rt.isActive)}
          onRowClick={(rt) => setEditingRecurring(rt)}
        />
        {showAddRecurring && (
          <RecurringTransactionModal
            accountId={account._id}
            otherAccounts={accounts.filter((a) => a._id !== account._id)}
            onClose={() => setShowAddRecurring(false)}
            onSaved={(formData) => {
              void createRecurring(formData);
              setShowAddRecurring(false);
            }}
            onDeleted={() => setShowAddRecurring(false)}
          />
        )}
        {editingRecurring && (
          <RecurringTransactionModal
            accountId={account._id}
            transaction={editingRecurring}
            otherAccounts={accounts.filter((a) => a._id !== account._id)}
            onClose={() => setEditingRecurring(null)}
            onSaved={(formData) => {
              void updateRecurring(editingRecurring._id, formData);
              setEditingRecurring(null);
            }}
            onDeleted={() => {
              void removeRecurring(editingRecurring._id);
              setEditingRecurring(null);
            }}
          />
        )}
      </section>
    </main>
  );
}
