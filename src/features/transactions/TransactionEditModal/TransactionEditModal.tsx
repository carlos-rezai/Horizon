import { useEffect, useState } from "react";
import type { Transaction } from "../../../types/transaction";
import type { AccountWithBalance } from "../../../types/account";
import type { Category } from "../../../types/category";
import { eurosToCents } from "../../../utils/currency/currency";
import { resolveAccountColor } from "../../../utils/color/color";
import { colorForCategoryName } from "../../../utils/categoryColor/categoryColor";
import { API_BASE } from "../../../utils/api/api";
import Modal from "../../../components/Modal/Modal";
import FormField from "../../../components/FormField/FormField";
import DatePicker from "../../../primitives/DatePicker/DatePicker";
import Input from "../../../primitives/Input/Input";
import Button from "../../../primitives/Button/Button";
import ChoiceChip from "../../../primitives/ChoiceChip/ChoiceChip";
import {
  StyledFields,
  StyledOnRow,
  StyledOnLabel,
  StyledOnAccount,
  StyledDot,
  StyledAccountName,
  StyledGrid,
  StyledChipRow,
  StyledTransferNote,
  StyledTransferDestination,
  StyledErrorText,
} from "./TransactionEditModal.styles";

type Flow = "in" | "out";

interface Props {
  transaction: Transaction;
  accounts?: AccountWithBalance[];
  toAccountName?: string;
  onClose: () => void;
  onSaved: (tx: Transaction) => void;
  onDeleted: (id: string, transferId?: string) => void;
}

export default function TransactionEditModal({
  transaction,
  accounts,
  toAccountName,
  onClose,
  onSaved,
  onDeleted,
}: Props) {
  const isTransfer = Boolean(transaction.transferId);
  const account = accounts?.find((a) => a.id === transaction.accountId);

  const [date, setDate] = useState(transaction.date);
  const [description, setDescription] = useState(transaction.description);
  const [amount, setAmount] = useState(
    String(Math.abs(transaction.amount) / 100)
  );
  const [flow, setFlow] = useState<Flow>(
    transaction.amount >= 0 ? "in" : "out"
  );
  const [category, setCategory] = useState(transaction.category);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/categories`)
      .then((res) => (res.ok ? res.json() : []))
      .then((data: unknown) => {
        if (!cancelled && Array.isArray(data)) {
          setCategories(data as Category[]);
        }
      })
      .catch(() => {
        /* categories are optional chrome; ignore load failures */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const canSave = !isTransfer && description.trim() !== "" && amount !== "";

  const handleSave = async () => {
    if (!canSave) return;
    const magnitude = Math.abs(eurosToCents(amount));
    const signed = flow === "out" ? -magnitude : magnitude;

    const res = await fetch(`${API_BASE}/transactions/${transaction.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, description, amount: signed, category }),
    });

    const data = (await res.json()) as Transaction & { error?: string };

    if (!res.ok) {
      setError(data.error ?? "Failed to update transaction");
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

    if (!res.ok) {
      const data = (await res.json()) as { error?: string };
      setError(data.error ?? "Failed to delete transaction");
      return;
    }

    onDeleted(transaction.id, transaction.transferId);
    onClose();
  };

  return (
    <Modal
      onClose={onClose}
      title="Edit transaction"
      footer={
        <>
          <Button
            variant="danger"
            icon="Trash2"
            onClick={handleDelete}
            style={{ marginRight: "auto" }}
          >
            Delete
          </Button>
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          {!isTransfer && (
            <Button
              variant="primary"
              icon="Check"
              onClick={handleSave}
              disabled={!canSave}
            >
              Save changes
            </Button>
          )}
        </>
      }
    >
      <StyledFields>
        {account && (
          <StyledOnRow>
            <StyledOnLabel>On</StyledOnLabel>
            <StyledOnAccount>
              <StyledDot $color={resolveAccountColor(account)} />
              <StyledAccountName>{account.name}</StyledAccountName>
            </StyledOnAccount>
          </StyledOnRow>
        )}

        {isTransfer && (
          <StyledTransferNote>
            <span>
              This is one leg of a transfer — deleting it removes{" "}
              <StyledTransferDestination>both legs</StyledTransferDestination>.
              {toAccountName && (
                <>
                  {" "}
                  Transfer to{" "}
                  <StyledTransferDestination>
                    {toAccountName}
                  </StyledTransferDestination>
                  .
                </>
              )}
            </span>
          </StyledTransferNote>
        )}

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

        <StyledGrid>
          <FormField label="Amount" htmlFor="edit-amount">
            <Input
              id="edit-amount"
              type="text"
              inputMode="decimal"
              aria-label="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              disabled={isTransfer}
            />
          </FormField>

          <FormField label="Date" htmlFor="edit-date">
            <DatePicker
              aria-label="Date"
              value={date}
              onChange={setDate}
              disabled={isTransfer}
            />
          </FormField>
        </StyledGrid>

        {!isTransfer && (
          <FormField label="Direction">
            <StyledChipRow>
              <ChoiceChip
                label="Outflow"
                active={flow === "out"}
                onClick={() => setFlow("out")}
              />
              <ChoiceChip
                label="Inflow"
                active={flow === "in"}
                onClick={() => setFlow("in")}
              />
            </StyledChipRow>
          </FormField>
        )}

        {categories.length > 0 && (
          <FormField label="Category">
            <StyledChipRow>
              {categories.map((c) => (
                <ChoiceChip
                  key={c.id}
                  label={c.name}
                  color={colorForCategoryName(c.name)}
                  active={category === c.name}
                  disabled={isTransfer}
                  onClick={() => !isTransfer && setCategory(c.name)}
                />
              ))}
            </StyledChipRow>
          </FormField>
        )}

        {error && <StyledErrorText role="alert">{error}</StyledErrorText>}
      </StyledFields>
    </Modal>
  );
}
