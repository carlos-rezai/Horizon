import type { RecurringTransaction } from "../../../types/recurring";
import { formatBalance } from "../../../utils/format";
import {
  StyledList,
  StyledRow,
  StyledDescription,
  StyledAmount,
  StyledMeta,
  StyledLinkedIndicator,
  StyledEmptyState,
} from "./RecurringTransactionList.styles";

interface Props {
  recurringTransactions: RecurringTransaction[];
  onToggle: (rt: RecurringTransaction) => void;
  onRowClick: (rt: RecurringTransaction) => void;
}

export default function RecurringTransactionList({
  recurringTransactions,
  onToggle,
  onRowClick,
}: Props) {
  if (recurringTransactions.length === 0) {
    return <StyledEmptyState>No recurring transactions</StyledEmptyState>;
  }

  return (
    <StyledList>
      {recurringTransactions.map((rt) => (
        <StyledRow
          key={rt._id}
          $inactive={!rt.isActive}
          data-inactive={rt.isActive ? undefined : "true"}
          onClick={() => onRowClick(rt)}
        >
          <input
            type="checkbox"
            checked={rt.isActive}
            onChange={() => {}}
            onClick={(e) => {
              e.stopPropagation();
              onToggle(rt);
            }}
            aria-label={`Toggle ${rt.description}`}
          />
          <StyledDescription>{rt.description}</StyledDescription>
          <StyledAmount>{formatBalance(rt.amount)}</StyledAmount>
          <StyledMeta>{rt.frequency}</StyledMeta>
          <StyledMeta>{rt.dayOfMonth}</StyledMeta>
          {rt.linkedAccountId && (
            <StyledLinkedIndicator data-testid="linked-account-indicator" />
          )}
        </StyledRow>
      ))}
    </StyledList>
  );
}
