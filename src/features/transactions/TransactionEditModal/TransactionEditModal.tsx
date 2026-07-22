import { useEffect, useState } from "react";
import type { Transaction } from "../../../types/transaction";
import type { AccountWithBalance } from "../../../types/account";
import type { Category } from "../../../types/category";
import { eurosToCents } from "../../../utils/currency/currency";
import { resolveAccountColor } from "../../../utils/color/color";
import { colorForCategoryName } from "../../../utils/categoryColor/categoryColor";
import { API_BASE } from "../../../utils/api/api";
import type { TransactionChanges } from "../../../utils/optimisticTransactions/optimisticTransactions";
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
} from "./TransactionEditModal.styles";

type Flow = "in" | "out";

interface Props {
  transaction: Transaction;
  accounts?: AccountWithBalance[];
  toAccountName?: string;
  onClose: () => void;
  /**
   * Hands the edited fields to the surface that owns the month's list — it
   * applies them optimistically, so the modal never waits on a request.
   */
  onSave: (changes: TransactionChanges) => void;
  onDelete: () => void;
}

export default function TransactionEditModal({
  transaction,
  accounts,
  toAccountName,
  onClose,
  onSave,
  onDelete,
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

  const handleSave = () => {
    if (!canSave) return;
    const magnitude = Math.abs(eurosToCents(amount));
    const signed = flow === "out" ? -magnitude : magnitude;

    onSave({ date, description, amount: signed, category });
  };

  const handleDelete = () => {
    if (!window.confirm("Are you sure you want to delete this transaction?")) {
      return;
    }

    onDelete();
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
              prefix="€"
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
      </StyledFields>
    </Modal>
  );
}
