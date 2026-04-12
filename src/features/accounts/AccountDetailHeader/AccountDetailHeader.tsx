import { useState } from "react";
import { Link } from "react-router-dom";
import type { AccountWithBalance } from "../../../types/account";
import { formatBalance } from "../../../utils/format";

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
    <header>
      <Link to="/">Back to dashboard</Link>

      {isEditing ? (
        <>
          <input
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
          />
          <button onClick={handleSave}>Save</button>
        </>
      ) : (
        <>
          <span>{displayName}</span>
          <button onClick={() => setIsEditing(true)}>Rename</button>
        </>
      )}

      {renameError && <p role="alert">{renameError}</p>}

      <span>{formatBalance(account.balance)}</span>

      <button
        onClick={() => !hasTransactions && setShowDeleteConfirm(true)}
        disabled={hasTransactions}
        title={
          hasTransactions
            ? "Cannot delete an account that has transactions"
            : undefined
        }
      >
        Delete
      </button>

      {showDeleteConfirm && (
        <>
          <button onClick={handleDelete}>Confirm</button>
          <button onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
        </>
      )}

      {deleteError && <p role="alert">{deleteError}</p>}
    </header>
  );
}
