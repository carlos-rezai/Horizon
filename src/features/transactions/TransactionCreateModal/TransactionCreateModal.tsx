import { useState } from "react";
import type { Category } from "../../../types/category";
import { eurosToCents } from "../../../utils/currency";
import { API_BASE } from "../../../utils/api";

interface Props {
  accountId: string;
  categories: Category[];
  onClose: () => void;
  onSuccess: () => void;
}

export default function TransactionCreateModal({
  accountId,
  categories,
  onClose,
  onSuccess,
}: Props) {
  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState(categories[0]?._id ?? "");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !amount || !description) return;

    const res = await fetch(`${API_BASE}/accounts/${accountId}/transactions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        amount: eurosToCents(amount),
        description,
        category,
      }),
    });

    const data = (await res.json()) as { error?: string };

    if (!res.ok) {
      setError(data.error ?? "Failed to create transaction");
      return;
    }

    onSuccess();
    onClose();
  };

  return (
    <div role="dialog" aria-modal="true">
      <form onSubmit={handleSubmit}>
        <label>
          Date
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </label>

        <label>
          Amount
          <input
            type="text"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </label>

        <label>
          Description
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </label>

        <label>
          Category
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            {categories.map((cat) => (
              <option key={cat._id} value={cat._id}>
                {cat.name}
              </option>
            ))}
          </select>
        </label>

        {error && <p role="alert">{error}</p>}

        <button type="submit">Add transaction</button>
        <button type="button" onClick={onClose}>
          Cancel
        </button>
      </form>
    </div>
  );
}
