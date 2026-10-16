import { useState } from "react";
import CategorySelect from "../../categories/CategorySelect/CategorySelect";
import { eurosToCents } from "../../../utils/currency/currency";
import { MONTHS_LONG } from "../../../utils/format/format";
import {
  buildRecurringInput,
  seedTransferForm,
  type TransferDirection,
} from "../transferForm/transferForm";
import type {
  RecurringTransaction,
  RecurringTransactionInput,
  RecurringFrequency,
} from "../../../types/recurring";
import type { AccountWithBalance } from "../../../types/account";
import Modal from "../../../components/Modal/Modal";
import FormField from "../../../components/FormField/FormField";
import Input from "../../../primitives/Input/Input";
import Select from "../../../primitives/Select/Select";
import Stepper from "../../../primitives/Stepper/Stepper";
import Button from "../../../primitives/Button/Button";
import ChoiceChip from "../../../primitives/ChoiceChip/ChoiceChip";
import {
  StyledForm,
  StyledActions,
  StyledChipRow,
  StyledErrorText,
} from "./RecurringTransactionModal.styles";

const TRANSFER_SIGN_MESSAGE =
  "Enter the transfer amount as a positive number — the direction sets which way it moves.";

interface Props {
  accountId: string;
  transaction?: RecurringTransaction;
  otherAccounts: AccountWithBalance[];
  onClose: () => void;
  onSaved: (data: RecurringTransactionInput) => void | Promise<void>;
  onDeleted: () => void | Promise<void>;
}

export default function RecurringTransactionModal({
  accountId,
  transaction,
  otherAccounts,
  onClose,
  onSaved,
  onDeleted,
}: Props) {
  const seed = transaction ? seedTransferForm(transaction, accountId) : null;
  const [amount, setAmount] = useState(seed ? String(seed.amount / 100) : "");
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
    seed?.counterpartId ?? ""
  );
  const [direction, setDirection] = useState<TransferDirection>(
    seed?.direction ?? "to"
  );
  const [monthOfYear, setMonthOfYear] = useState<number>(
    transaction?.monthOfYear ?? new Date().getMonth() + 1
  );
  // Seeded from the row so saving before the category list loads keeps the
  // existing category instead of clearing it. CategorySelect re-confirms it
  // via onChange once the fetch resolves.
  const [category, setCategory] = useState(transaction?.category ?? "");
  const [error, setError] = useState<string | null>(null);

  // The save and delete callbacks may return a promise: the dialog closes
  // once it resolves, and on rejection stays open with the server's reason.
  const settle = (result: void | Promise<void>) => {
    if (!(result instanceof Promise)) {
      onClose();
      return;
    }
    result.then(onClose, (err: unknown) => {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    });
  };

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
      setError(TRANSFER_SIGN_MESSAGE);
      return;
    }

    const payload = buildRecurringInput(
      {
        amount: parsedAmount,
        description,
        category,
        frequency,
        dayOfMonth,
        counterpartId: linkedAccountId,
        direction,
        monthOfYear,
      },
      accountId
    );

    settle(onSaved(payload));
  };

  const handleDelete = () => {
    if (
      !window.confirm(
        "Are you sure you want to delete this recurring transaction?"
      )
    ) {
      return;
    }

    settle(onDeleted());
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
              {MONTHS_LONG.map((name, i) => (
                <option key={i + 1} value={i + 1}>
                  {name}
                </option>
              ))}
            </Select>
          </FormField>
        )}

        <CategorySelect
          onChange={setCategory}
          initialCategory={transaction?.category}
        />

        <FormField label="Transfer (optional)" htmlFor="rt-linked-account">
          <Select
            id="rt-linked-account"
            aria-label="Transfer (optional)"
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

        {linkedAccountId && (
          <FormField label="Direction">
            <StyledChipRow>
              <ChoiceChip
                label="To"
                active={direction === "to"}
                onClick={() => setDirection("to")}
              />
              <ChoiceChip
                label="From"
                active={direction === "from"}
                onClick={() => setDirection("from")}
              />
            </StyledChipRow>
          </FormField>
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
