import { useState } from "react";
import { Link } from "react-router-dom";
import { Pencil, Trash2 } from "lucide-react";
import type { AccountWithBalance } from "../../../types/account";
import { formatBalance } from "../../../utils/format";
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
  onDelete: () => Promise<void>;
}

export default function AccountDetailHeader({
  account,
  hasTransactions,
  onRename,
  onDelete,
}: Props) {
  const [isEditing, setIsEditing] = useState(false);
  const [nameInput, setNameInput] = useState(account.name);
  const [displayName, setDisplayName] = useState(account.name);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const handleSave = async () => {
    setRenameError(null);
    try {
      await onRename(nameInput);
      setDisplayName(nameInput);
      setIsEditing(false);
    } catch (err) {
      setRenameError(err instanceof Error ? err.message : "Rename failed");
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
      <Link to="/">Back to dashboard</Link>

      {isEditing ? (
        <StyledActions>
          <Input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
          />
          <Button onClick={handleSave}>Save</Button>
        </StyledActions>
      ) : (
        <StyledActions>
          <StyledAccountName>{displayName}</StyledAccountName>
          <Button
            aria-label="Edit account name"
            onClick={() => setIsEditing(true)}
          >
            <Pencil size={16} />
          </Button>
        </StyledActions>
      )}

      {renameError && (
        <StyledErrorText role="alert">{renameError}</StyledErrorText>
      )}

      <StyledBalance>{formatBalance(account.balance)}</StyledBalance>

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
