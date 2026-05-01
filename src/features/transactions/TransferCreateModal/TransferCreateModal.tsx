import { useState } from "react";
import CategorySelect from "../../categories/CategorySelect/CategorySelect";
import { eurosToCents } from "../../../utils/currency";
import { API_BASE } from "../../../utils/api";
import type { AccountWithBalance } from "../../../types/account";
import Modal from "../../../components/Modal/Modal";
import FormField from "../../../components/FormField/FormField";
import Input from "../../../primitives/Input/Input";
import Select from "../../../primitives/Select/Select";
import Button from "../../../primitives/Button/Button";
import {
  StyledForm,
  StyledActions,
  StyledErrorText,
} from "./TransferCreateModal.styles";

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
  const destinationAccounts = accounts.filter((a) => a.id !== fromAccountId);

  const [toAccountId, setToAccountId] = useState(
    destinationAccounts[0]?.id ?? ""
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
    <Modal onClose={onClose}>
      <StyledForm onSubmit={handleSubmit}>
        <FormField label="Destination account" htmlFor="transfer-to">
          <Select
            id="transfer-to"
            value={toAccountId}
            onChange={(e) => setToAccountId(e.target.value)}
          >
            {destinationAccounts.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </FormField>

        <FormField label="Date" htmlFor="transfer-date">
          <Input
            id="transfer-date"
            type="date"
            aria-label="Date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
        </FormField>

        <FormField label="Amount" htmlFor="transfer-amount">
          <Input
            id="transfer-amount"
            type="number"
            aria-label="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            step="0.01"
          />
        </FormField>

        <FormField label="Description" htmlFor="transfer-description">
          <Input
            id="transfer-description"
            type="text"
            aria-label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </FormField>

        <CategorySelect onChange={setCategoryId} />

        {error && <StyledErrorText role="alert">{error}</StyledErrorText>}

        <StyledActions>
          <Button type="submit">Transfer</Button>
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </StyledActions>
      </StyledForm>
    </Modal>
  );
}
