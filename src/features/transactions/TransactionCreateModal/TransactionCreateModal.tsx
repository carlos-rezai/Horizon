import { useState } from "react";
import { useCategoriesWithInlineAdd } from "../useCategoriesWithInlineAdd";
import { eurosToCents } from "../../../utils/currency";
import { API_BASE } from "../../../utils/api";

const ADD_CATEGORY_VALUE = "__add__";

interface Props {
  accountId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function TransactionCreateModal({
  accountId,
  onClose,
  onSuccess,
}: Props) {
  const {
    categories,
    selectedCategoryId,
    setSelectedCategoryId,
    isAdding,
    addCategory,
    addError,
  } = useCategoriesWithInlineAdd();

  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showInlineAdd, setShowInlineAdd] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");

  const handleCategoryChange = (value: string) => {
    if (value === ADD_CATEGORY_VALUE) {
      setShowInlineAdd(true);
    } else {
      setSelectedCategoryId(value);
    }
  };

  const handleAddCategory = async () => {
    try {
      await addCategory(newCategoryName);
      setShowInlineAdd(false);
      setNewCategoryName("");
    } catch {
      setShowInlineAdd(false);
    }
  };

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
        category: selectedCategoryId,
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

        {showInlineAdd ? (
          <>
            <label>
              New category name
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                disabled={isAdding}
              />
            </label>
            <button
              type="button"
              onClick={handleAddCategory}
              disabled={isAdding}
            >
              Add category
            </button>
          </>
        ) : (
          <label>
            Category
            <select
              value={selectedCategoryId}
              onChange={(e) => handleCategoryChange(e.target.value)}
              disabled={isAdding}
            >
              {categories.map((cat) => (
                <option key={cat._id} value={cat._id}>
                  {cat.name}
                </option>
              ))}
              <option value={ADD_CATEGORY_VALUE}>+ Add category</option>
            </select>
          </label>
        )}

        {addError && <p>{addError}</p>}
        {error && <p role="alert">{error}</p>}

        <button type="submit">Add transaction</button>
        <button type="button" onClick={onClose}>
          Cancel
        </button>
      </form>
    </div>
  );
}
