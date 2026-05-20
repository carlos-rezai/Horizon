import { useState } from "react";
import CategorySelect from "../../categories/CategorySelect/CategorySelect";
import { eurosToCents } from "../../../utils/currency/currency";
import type {
  RecurringTransaction,
  RecurringFrequency,
} from "../../../types/recurring";
import type { AccountWithBalance } from "../../../types/account";
import Modal from "../../../components/Modal/Modal";
import FormField from "../../../components/FormField/FormField";
import Input from "../../../primitives/Input/Input";
import Select from "../../../primitives/Select/Select";
import Stepper from "../../../primitives/Stepper/Stepper";
import Button from "../../../primitives/Button/Button";
import {
  StyledForm,
  StyledActions,
  StyledErrorText,
  StyledWarningText,
} from "./RecurringTransactionModal.styles";

export interface RecurringFormPayload {
  amount: number;
  description: string;
  category: string;
  frequency: RecurringFrequency;
  dayOfMonth: number;
  linkedAccountId?: string;
  monthOfYear?: number;
}

interface Props {
  accountId: string;
  transaction?: RecurringTransaction;
  otherAccounts: AccountWithBalance[];
  onClose: () => void;
  onSaved: (data: RecurringFormPayload) => void;
  onDeleted: () => void;
}

export default function RecurringTransactionModal({
  transaction,
  otherAccounts,
  onClose,
  onSaved,
  onDeleted,
}: Props) {
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
    transaction ? transaction.dayOfMonth : 1
  );
  const [linkedAccountId, setLinkedAccountId] = useState(
    transaction?.linkedAccountId ?? ""
  );
  const [monthOfYear, setMonthOfYear] = useState<number>(
    transaction?.monthOfYear ?? new Date().getMonth() + 1
  );
  const [categoryId, setCategoryId] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (!amount || !description) {
      setError("Please fill in all required fields.");
      return;
    }

    const parsedAmount = eurosToCents(amount);

    if (isNaN(parsedAmount)) {
      setError("Amount must be a valid number.");
      return;
    }

    if (linkedAccountId && parsedAmount <= 0) {
      setError("Transfer amount must be greater than zero.");
      return;
    }

    const payload: RecurringFormPayload = {
      amount: parsedAmount,
      description,
      category: categoryId,
      frequency,
      dayOfMonth,
      ...(linkedAccountId ? { linkedAccountId } : {}),
      ...(frequency === "annual" ? { monthOfYear } : {}),
    };

    onSaved(payload);
    onClose();
  };

  const handleDelete = () => {
    if (
      !window.confirm(
        "Are you sure you want to delete this recurring transaction?"
      )
    ) {
      return;
    }

    onDeleted();
    onClose();
  };

  return (
    <Modal onClose={onClose}>
      <StyledForm onSubmit={handleSave}>
        <FormField label="Amount" htmlFor="rt-amount">
          <Input
            id="rt-amount"
            type="text"
            inputMode="decimal"
            aria-label="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
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
          <Stepper
            value={dayOfMonth}
            onChange={setDayOfMonth}
            min={1}
            max={31}
          />
        </FormField>

        {frequency === "annual" && (
          <FormField label="Month of year" htmlFor="rt-month-of-year">
            <Select
              id="rt-month-of-year"
              aria-label="Month of year"
              value={monthOfYear}
              onChange={(e) => setMonthOfYear(parseInt(e.target.value, 10))}
            >
              {[
                "January",
                "February",
                "March",
                "April",
                "May",
                "June",
                "July",
                "August",
                "September",
                "October",
                "November",
                "December",
              ].map((name, i) => (
                <option key={i + 1} value={i + 1}>
                  {name}
                </option>
              ))}
            </Select>
          </FormField>
        )}

        <CategorySelect
          onChange={setCategoryId}
          initialCategoryId={transaction?.category}
        />

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
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </Select>
        </FormField>

        {otherAccounts.find((a) => a.id === linkedAccountId)?.kind ===
          "Mortgage" && (
          <StyledWarningText role="status">
            Linking to a Mortgage account models a Recurring Transfer that
            reduces the Restschuld each time it fires. Per the ST-only model,
            only Sondertilgung payments should link to a Mortgage account.
          </StyledWarningText>
        )}

        {error && <StyledErrorText role="alert">{error}</StyledErrorText>}

        <StyledActions>
          <Button type="submit">Save</Button>
          {transaction && (
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
