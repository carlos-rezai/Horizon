import { useState } from "react";
import CategorySelect from "../../categories/CategorySelect/CategorySelect";
import { eurosToCents } from "../../../utils/currency";
import { API_BASE } from "../../../utils/api";
import type { AccountWithBalance } from "../../../types/account";

interface Props {
  fromAccountId: string;
  accounts: AccountWithBalance[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function TransferCreateModal({
  fromAccountId,
  accounts,
  onClose,
  onSuccess,
}: Props) {
  const destinationAccounts = accounts.filter((a) => a._id !== fromAccountId);

  const [toAccountId, setToAccountId] = useState(
    destinationAccounts[0]?._id ?? ""
  );
  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!date || !amount) {
      setError("Please fill in all required fields.");
      return;
    }

    const res = await fetch(`${API_BASE}/transfers`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fromAccountId,
        toAccountId,
        amount: eurosToCents(amount),
        date,
        description,
        category: categoryId,
      }),
    });

    const data = (await res.json()) as { error?: string };

    if (!res.ok) {
      setError(data.error ?? "Failed to create transfer");
      return;
    }

    onSuccess();
    onClose();
  };

  return (
    <div role="dialog" aria-modal="true">
      <form onSubmit={handleSubmit}>
        <label>
          Destination account
          <select
            value={toAccountId}
            onChange={(e) => setToAccountId(e.target.value)}
          >
            {destinationAccounts.map((a) => (
              <option key={a._id} value={a._id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>

        <label>
          Date
          <input
            type="date"
            aria-label="Date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>

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

        <CategorySelect onChange={setCategoryId} />

        {error && <p role="alert">{error}</p>}

        <button type="submit">Transfer</button>
        <button type="button" onClick={onClose}>
          Cancel
        </button>
      </form>
    </div>
  );
}
