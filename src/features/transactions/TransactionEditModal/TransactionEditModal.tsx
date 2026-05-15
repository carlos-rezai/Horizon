import { useState } from "react";
import type { Transaction } from "../../../types/transaction";
import { eurosToCents } from "../../../utils/currency/currency";
import { API_BASE } from "../../../utils/api/api";
import Modal from "../../../components/Modal/Modal";
import FormField from "../../../components/FormField/FormField";
import Input from "../../../primitives/Input/Input";
import Button from "../../../primitives/Button/Button";
import {
  StyledFields,
  StyledActions,
  StyledTransferNote,
  StyledErrorText,
} from "./TransactionEditModal.styles";

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
    const res = await fetch(`${API_BASE}/transactions/${transaction.id}`, {
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
      : `${API_BASE}/transactions/${transaction.id}`;

    const res = await fetch(url, { method: "DELETE" });
    const data = (await res.json()) as { error?: string };

    if (!res.ok) {
      setError(data.error ?? "Failed to delete transaction");
      return;
    }

    onDeleted(transaction.id, transaction.transferId);
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <StyledFields>
        {isTransfer && (
          <StyledTransferNote>
            This is one leg of a transfer — deleting it will remove both legs.
          </StyledTransferNote>
        )}

        <FormField label="Date" htmlFor="edit-date">
          <Input
            id="edit-date"
            type="date"
            aria-label="Date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            disabled={isTransfer}
          />
        </FormField>

        <FormField label="Description" htmlFor="edit-description">
          <Input
            id="edit-description"
            type="text"
            aria-label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={isTransfer}
          />
        </FormField>

        <FormField label="Amount" htmlFor="edit-amount">
          <Input
            id="edit-amount"
            type="number"
            aria-label="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            disabled={isTransfer}
            step="0.01"
          />
        </FormField>

        {error && <StyledErrorText role="alert">{error}</StyledErrorText>}

        <StyledActions>
          {!isTransfer && (
            <Button type="button" onClick={handleSave}>
              Save
            </Button>
          )}
          <Button type="button" variant="danger" onClick={handleDelete}>
            Delete
          </Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </StyledActions>
      </StyledFields>
    </Modal>
  );
}
