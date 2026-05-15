import { useState } from "react";
import { Pencil, Trash2 } from "lucide-react";
import type { AccountWithBalance } from "../../../types/account";
import { formatBalance } from "../../../utils/format/format";
import { centsToEuros, eurosToCents } from "../../../utils/currency/currency";
import Input from "../../../primitives/Input/Input";
import Button from "../../../primitives/Button/Button";
import {
  StyledHeader,
  StyledAccountName,
  StyledBalance,
  StyledActions,
  StyledErrorText,
  StyledConfirmRow,
} from "./AccountDetailHeader.styles";

interface Props {
  account: AccountWithBalance;
  hasTransactions: boolean;
  onRename: (name: string) => Promise<void>;
  onUpdateOpeningBalance: (openingBalance: number) => Promise<void>;
  onDelete: () => Promise<void>;
}

export default function AccountDetailHeader({
  account,
  hasTransactions,
  onRename,
  onUpdateOpeningBalance,
  onDelete,
}: Props) {
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(account.name);
  const [displayName, setDisplayName] = useState(account.name);
  const [renameError, setRenameError] = useState<string | null>(null);

  const [isEditingBalance, setIsEditingBalance] = useState(false);
  const [balanceInput, setBalanceInput] = useState(
    String(centsToEuros(account.openingBalance))
  );
  const [balanceError, setBalanceError] = useState<string | null>(null);

  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleSaveName = async () => {
    setRenameError(null);
    try {
      await onRename(nameInput);
      setDisplayName(nameInput);
      setIsEditingName(false);
    } catch (err) {
      setRenameError(err instanceof Error ? err.message : "Rename failed");
    }
  };

  const handleSaveBalance = async () => {
    setBalanceError(null);
    try {
      await onUpdateOpeningBalance(eurosToCents(balanceInput));
      setIsEditingBalance(false);
    } catch (err) {
      setBalanceError(err instanceof Error ? err.message : "Update failed");
    }
  };

  const handleDelete = async () => {
    setDeleteError(null);
    try {
      await onDelete();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  return (
    <StyledHeader>
      {isEditingName ? (
        <StyledActions>
          <Input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
          />
          <Button onClick={handleSaveName}>Save</Button>
        </StyledActions>
      ) : (
        <StyledActions>
          <StyledAccountName>{displayName}</StyledAccountName>
          <Button
            aria-label="Edit account name"
            onClick={() => setIsEditingName(true)}
          >
            <Pencil size={16} />
          </Button>
        </StyledActions>
      )}

      {renameError && (
        <StyledErrorText role="alert">{renameError}</StyledErrorText>
      )}

      {isEditingBalance ? (
        <StyledActions>
          <Input
            aria-label="Opening balance"
            type="number"
            step="0.01"
            value={balanceInput}
            onChange={(e) => setBalanceInput(e.target.value)}
          />
          <Button onClick={handleSaveBalance}>Save</Button>
          <Button
            variant="secondary"
            onClick={() => setIsEditingBalance(false)}
          >
            Cancel
          </Button>
        </StyledActions>
      ) : (
        <StyledActions>
          <StyledBalance>{formatBalance(account.balance)}</StyledBalance>
          <Button
            aria-label="Edit opening balance"
            onClick={() => setIsEditingBalance(true)}
          >
            <Pencil size={16} />
          </Button>
        </StyledActions>
      )}

      {balanceError && (
        <StyledErrorText role="alert">{balanceError}</StyledErrorText>
      )}

      <Button
        variant="danger"
        onClick={() => !hasTransactions && setShowDeleteConfirm(true)}
        disabled={hasTransactions}
        title={
          hasTransactions
            ? "Cannot delete an account that has transactions"
            : undefined
        }
        aria-label="Delete account"
      >
        <Trash2 size={16} />
      </Button>

      {showDeleteConfirm && (
        <StyledConfirmRow>
          <Button onClick={handleDelete}>Confirm</Button>
          <Button
            variant="secondary"
            onClick={() => setShowDeleteConfirm(false)}
          >
            Cancel
          </Button>
        </StyledConfirmRow>
      )}

      {deleteError && (
        <StyledErrorText role="alert">{deleteError}</StyledErrorText>
      )}
    </StyledHeader>
  );
}
