import { useState } from "react";
import CategorySelect from "../../categories/CategorySelect/CategorySelect";
import { eurosToCents } from "../../../utils/currency/currency";
import type { AccountWithBalance } from "../../../types/account";
import type { TransactionDraft } from "../../../types/transaction";
import Modal from "../../../components/Modal/Modal";
import FormField from "../../../components/FormField/FormField";
import DatePicker from "../../../primitives/DatePicker/DatePicker";
import Input from "../../../primitives/Input/Input";
import Select from "../../../primitives/Select/Select";
import Button from "../../../primitives/Button/Button";
import { StyledForm, StyledActions } from "./TransactionCreateModal.styles";

interface Props {
  accountId: string;
  accounts?: AccountWithBalance[];
  month?: string;
  onClose: () => void;
  /**
   * Hands the typed draft to the surface that owns the month's list — it
   * records the expense optimistically, so the modal never waits on a request.
   */
  onSubmit: (draft: TransactionDraft) => void;
}

function getMonthBounds(month: string): { first: string; last: string } {
  const [year, mon] = month.split("-").map(Number);
  const lastDay = new Date(year, mon, 0).getDate();
  const first = `${month}-01`;
  const last = `${year}-${String(mon).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
  return { first, last };
}

export default function TransactionCreateModal({
  accountId,
  accounts,
  month,
  onClose,
  onSubmit,
}: Props) {
  const [date, setDate] = useState("");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [toAccountId, setToAccountId] = useState("");

  const { first: minDate, last: maxDate } = month
    ? getMonthBounds(month)
    : { first: undefined, last: undefined };

  const destinationAccounts = accounts
    ? accounts.filter((a) => a.id !== accountId)
    : [];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!date || !amount || !description) return;

    onSubmit({
      date,
      amount: eurosToCents(amount),
      description,
      category,
      ...(toAccountId ? { toAccountId } : {}),
    });
  };

  return (
    <Modal onClose={onClose}>
      <StyledForm onSubmit={handleSubmit}>
        <FormField label="Date" htmlFor="txn-date">
          <DatePicker
            aria-label="Date"
            value={date}
            onChange={setDate}
            minDate={minDate}
            maxDate={maxDate}
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

        <CategorySelect onChange={setCategory} />

        {accounts !== undefined && (
          <FormField label="To account" htmlFor="txn-to-account">
            <Select
              id="txn-to-account"
              aria-label="To account"
              value={toAccountId}
              onChange={(e) => setToAccountId(e.target.value)}
            >
              <option value="">— None —</option>
              {destinationAccounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          </FormField>
        )}

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
