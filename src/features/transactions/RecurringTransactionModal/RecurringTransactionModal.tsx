import { useState } from "react";
import CategorySelect from "../../categories/CategorySelect/CategorySelect";
import { eurosToCents } from "../../../utils/currency";
import { API_BASE } from "../../../utils/api";
import type {
  RecurringTransaction,
  RecurringFrequency,
} from "../../../types/recurring";
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
} from "./RecurringTransactionModal.styles";

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
    <Modal onClose={onClose}>
      <StyledForm onSubmit={handleSave}>
        <FormField label="Amount" htmlFor="rt-amount">
          <Input
            id="rt-amount"
            type="number"
            aria-label="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            step="0.01"
          />
        </FormField>

        <FormField label="Description" htmlFor="rt-description">
          <Input
            id="rt-description"
            type="text"
            aria-label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </FormField>

        <FormField label="Frequency" htmlFor="rt-frequency">
          <Select
            id="rt-frequency"
            value={frequency}
            onChange={(e) => setFrequency(e.target.value as RecurringFrequency)}
          >
            <option value="monthly">Monthly</option>
            <option value="quarterly">Quarterly</option>
            <option value="annual">Annual</option>
          </Select>
        </FormField>

        <FormField label="Day of month" htmlFor="rt-day">
          <Input
            id="rt-day"
            type="number"
            value={dayOfMonth}
            onChange={(e) => setDayOfMonth(e.target.value)}
            min="1"
            max="31"
          />
        </FormField>

        <CategorySelect onChange={setCategoryId} />

        <FormField
          label="Transfer to account (optional)"
          htmlFor="rt-linked-account"
        >
          <Select
            id="rt-linked-account"
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
          </Select>
        </FormField>

        {error && <StyledErrorText role="alert">{error}</StyledErrorText>}

        <StyledActions>
          <Button type="submit">Save</Button>
          {isEdit && (
            <Button type="button" variant="danger" onClick={handleDelete}>
              Delete
            </Button>
          )}
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
        </StyledActions>
      </StyledForm>
    </Modal>
  );
}
