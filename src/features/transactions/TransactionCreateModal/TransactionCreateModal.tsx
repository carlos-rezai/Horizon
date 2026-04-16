import { useState } from "react";
import CategorySelect from "../../categories/CategorySelect/CategorySelect";
import { eurosToCents } from "../../../utils/currency";
import { API_BASE } from "../../../utils/api";
import Modal from "../../../components/Modal/Modal";
import FormField from "../../../components/FormField/FormField";
import Input from "../../../primitives/Input/Input";
import Button from "../../../primitives/Button/Button";
import {
  StyledForm,
  StyledActions,
  StyledErrorText,
} from "./TransactionCreateModal.styles";

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
  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [categoryId, setCategoryId] = useState("");
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
        category: categoryId,
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
    <Modal onClose={onClose}>
      <StyledForm onSubmit={handleSubmit}>
        <FormField label="Date" htmlFor="txn-date">
          <Input
            id="txn-date"
            type="date"
            aria-label="Date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </FormField>

        <FormField label="Amount" htmlFor="txn-amount">
          <Input
            id="txn-amount"
            type="text"
            aria-label="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </FormField>

        <FormField label="Description" htmlFor="txn-description">
          <Input
            id="txn-description"
            type="text"
            aria-label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </FormField>

        <CategorySelect onChange={setCategoryId} />

        {error && <StyledErrorText role="alert">{error}</StyledErrorText>}

        <StyledActions>
          <Button type="submit">Add transaction</Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </StyledActions>
      </StyledForm>
    </Modal>
  );
}
