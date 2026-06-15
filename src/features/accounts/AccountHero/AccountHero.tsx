import { useState } from "react";
import { useTheme } from "styled-components";
import type { AccountWithBalance } from "../../../types/account";
import Card from "../../../components/Card/Card";
import StatBlock from "../../../components/StatBlock/StatBlock";
import Avatar from "../../../primitives/Avatar/Avatar";
import Badge from "../../../primitives/Badge/Badge";
import Chip from "../../../primitives/Chip/Chip";
import Money from "../../../primitives/Money/Money";
import Button from "../../../primitives/Button/Button";
import Heading from "../../../primitives/Heading/Heading";
import Sparkline from "../../../primitives/Sparkline/Sparkline";
import { resolveAccountColor } from "../../../utils/color/color";
import { accountSubtitle } from "../../../utils/accountSubtitle/accountSubtitle";
import {
  StyledTop,
  StyledIdentity,
  StyledNameRow,
  StyledMetaRow,
  StyledSubtitle,
  StyledActions,
  StyledBalanceRow,
  StyledBalanceValue,
  StyledConfirmRow,
  StyledErrorText,
} from "./AccountHero.styles";

interface Props {
  account: AccountWithBalance;
  accounts: AccountWithBalance[];
  /** The account's month-by-month balance, for the hero sparkline. */
  balanceSeries: number[];
  /** Deletion is blocked while the account still has one-off transactions. */
  hasTransactions: boolean;
  onEdit: () => void;
  onDelete: () => void | Promise<void>;
}

export default function AccountHero({
  account,
  accounts,
  balanceSeries,
  hasTransactions,
  onEdit,
  onDelete,
}: Props) {
  const theme = useTheme();
  const [confirming, setConfirming] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const isDebt = account.kind === "Mortgage" || account.balance < 0;
  const accentColor = resolveAccountColor(account);
  const sparkColor = isDebt ? theme.colors.error : theme.colors.secondary;

  const handleConfirmDelete = async () => {
    setDeleteError(null);
    try {
      await onDelete();
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : "Delete failed");
    }
  };

  return (
    <Card>
      <StyledTop>
        <StyledIdentity>
          <Avatar account={account} size={56} />
          <div>
            <StyledNameRow>
              <Heading level={1}>{account.name}</Heading>
              <Chip color={accentColor} />
            </StyledNameRow>
            <StyledMetaRow>
              <Badge kind={account.kind} />
              <StyledSubtitle>
                {accountSubtitle(account, accounts)}
              </StyledSubtitle>
            </StyledMetaRow>
          </div>
        </StyledIdentity>
        <StyledActions>
          <Button
            variant="ghost"
            size="sm"
            icon="Pencil"
            onClick={onEdit}
            aria-label="Edit account"
          >
            Edit
          </Button>
          <Button
            variant="danger"
            size="sm"
            icon="Trash2"
            onClick={() => setConfirming(true)}
            disabled={hasTransactions}
            title={
              hasTransactions
                ? "Cannot delete an account that has transactions"
                : undefined
            }
          >
            Delete
          </Button>
        </StyledActions>
      </StyledTop>

      {confirming && (
        <StyledConfirmRow>
          <Button variant="danger" size="sm" onClick={handleConfirmDelete}>
            Confirm
          </Button>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setConfirming(false)}
          >
            Cancel
          </Button>
        </StyledConfirmRow>
      )}
      {deleteError && (
        <StyledErrorText role="alert">{deleteError}</StyledErrorText>
      )}

      <StyledBalanceRow>
        <StatBlock label={isDebt ? "Restschuld" : "Current Balance"}>
          <StyledBalanceValue $isDebt={isDebt}>
            <Money cents={account.balance} />
          </StyledBalanceValue>
        </StatBlock>
        <Sparkline
          data={balanceSeries}
          color={sparkColor}
          width={200}
          height={48}
          fill
        />
      </StyledBalanceRow>
    </Card>
  );
}
