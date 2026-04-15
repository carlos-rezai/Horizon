import { useState } from "react";
import type { Transaction } from "../../../types/transaction";
import { eurosToCents } from "../../../utils/currency";
import { API_BASE } from "../../../utils/api";

interface Props {
  transaction: Transaction;
  onClose: () => void;
  onSaved: (tx: Transaction) => void;
  onDeleted: (id: string, transferId?: string) => void;
}

export default function TransactionEditModal({
  transaction,
  onClose,
  onSaved,
  onDeleted,
}: Props) {
  const isTransfer = Boolean(transaction.transferId);

  const [date, setDate] = useState(transaction.date);
  const [description, setDescription] = useState(transaction.description);
  const [amount, setAmount] = useState(String(transaction.amount / 100));
  const [error, setError] = useState<string | null>(null);

  const handleSave = async () => {
    const res = await fetch(`${API_BASE}/transactions/${transaction._id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        description,
        amount: eurosToCents(amount),
        category: transaction.category,
      }),
    });

    const data = (await res.json()) as Transaction & { error?: string };

    if (!res.ok) {
      setError(
        (data as { error?: string }).error ?? "Failed to update transaction"
      );
      return;
    }

    onSaved(data);
    onClose();
  };

  const handleDelete = async () => {
    if (!window.confirm("Are you sure you want to delete this transaction?")) {
      return;
    }

    const url = isTransfer
      ? `${API_BASE}/transfers/${transaction.transferId}`
      : `${API_BASE}/transactions/${transaction._id}`;

    const res = await fetch(url, { method: "DELETE" });
    const data = (await res.json()) as { error?: string };

    if (!res.ok) {
      setError(data.error ?? "Failed to delete transaction");
      return;
    }

    onDeleted(transaction._id, transaction.transferId);
    onClose();
  };

  return (
    <div role="dialog" aria-modal="true">
      {isTransfer && (
        <p>
          This is one leg of a transfer — deleting it will remove both legs.
        </p>
      )}

      <label>
        Date
        <input
          type="date"
          aria-label="Date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          disabled={isTransfer}
        />
      </label>

      <label>
        Description
        <input
          type="text"
          aria-label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          disabled={isTransfer}
        />
      </label>

      <label>
        Amount
        <input
          type="number"
          aria-label="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          disabled={isTransfer}
          step="0.01"
        />
      </label>

      {error && <p role="alert">{error}</p>}

      {!isTransfer && (
        <button type="button" onClick={handleSave}>
          Save
        </button>
      )}

      <button type="button" onClick={handleDelete}>
        Delete
      </button>

      <button type="button" onClick={onClose}>
        Cancel
      </button>
    </div>
  );
}
