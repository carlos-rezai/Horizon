import { useState } from "react";
import CategorySelect from "../../categories/CategorySelect/CategorySelect";
import { eurosToCents } from "../../../utils/currency";
import { API_BASE } from "../../../utils/api";
import type {
  RecurringTransaction,
  RecurringFrequency,
} from "../../../types/recurring";
import type { AccountWithBalance } from "../../../types/account";

interface Props {
  accountId: string;
  transaction?: RecurringTransaction;
  otherAccounts: AccountWithBalance[];
  onClose: () => void;
  onSaved: (rt: RecurringTransaction) => void;
  onDeleted: (id: string) => void;
}

export default function RecurringTransactionModal({
  accountId,
  transaction,
  otherAccounts,
  onClose,
  onSaved,
  onDeleted,
}: Props) {
  const isEdit = Boolean(transaction);

  const [amount, setAmount] = useState(
    transaction ? String(transaction.amount / 100) : ""
  );
  const [description, setDescription] = useState(
    transaction?.description ?? ""
  );
  const [frequency, setFrequency] = useState<RecurringFrequency>(
    transaction?.frequency ?? "monthly"
  );
  const [dayOfMonth, setDayOfMonth] = useState(
    transaction ? String(transaction.dayOfMonth) : "1"
  );
  const [linkedAccountId, setLinkedAccountId] = useState(
    transaction?.linkedAccountId ?? ""
  );
  const [categoryId, setCategoryId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || !description) {
      setError("Please fill in all required fields.");
      return;
    }

    const payload = {
      accountId,
      amount: eurosToCents(amount),
      description,
      category: categoryId,
      frequency,
      dayOfMonth: parseInt(dayOfMonth, 10),
      ...(linkedAccountId ? { linkedAccountId } : {}),
    };

    const url = isEdit
      ? `${API_BASE}/recurring-transactions/${transaction!._id}`
      : `${API_BASE}/recurring-transactions`;
    const method = isEdit ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = (await res.json()) as RecurringTransaction & {
      error?: string;
    };

    if (!res.ok) {
      setError(
        (data as { error?: string }).error ??
          "Failed to save recurring transaction"
      );
      return;
    }

    onSaved(data);
    onClose();
  };

  const handleDelete = async () => {
    if (
      !window.confirm(
        "Are you sure you want to delete this recurring transaction?"
      )
    ) {
      return;
    }

    const res = await fetch(
      `${API_BASE}/recurring-transactions/${transaction!._id}`,
      { method: "DELETE" }
    );
    const data = (await res.json()) as { error?: string };

    if (!res.ok) {
      setError(data.error ?? "Failed to delete recurring transaction");
      return;
    }

    onDeleted(transaction!._id);
    onClose();
  };

  return (
    <div role="dialog" aria-modal="true">
      <form onSubmit={handleSave}>
        <label>
          Amount
          <input
            type="number"
            aria-label="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            step="0.01"
          />
        </label>

        <label>
          Description
          <input
            type="text"
            aria-label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        <label>
          Frequency
          <select
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as RecurringFrequency)}
          >
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="annual">Annual</option>
          </select>
        </label>

        <label>
          Day of month
          <input
            type="number"
            value={dayOfMonth}
            onChange={(e) => setDayOfMonth(e.target.value)}
            min="1"
            max="31"
          />
        </label>

        <CategorySelect onChange={setCategoryId} />

        <label>
          Transfer to account (optional)
          <select
            aria-label="Transfer to account (optional)"
            value={linkedAccountId}
            onChange={(e) => setLinkedAccountId(e.target.value)}
          >
            <option value="">— None</option>
            {otherAccounts.map((a) => (
              <option key={a._id} value={a._id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>

        {error && <p role="alert">{error}</p>}

        <button type="submit">Save</button>

        {isEdit && (
          <button type="button" onClick={handleDelete}>
            Delete
          </button>
        )}

        <button type="button" onClick={onClose}>
          Cancel
        </button>
      </form>
    </div>
  );
}
