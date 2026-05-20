import type { RecurringTransaction } from "../../../types/recurring";
import { formatBalance, toOrdinal } from "../../../utils/format/format";
import {
  StyledList,
  StyledRow,
  StyledDescription,
  StyledAmount,
  StyledMeta,
  StyledLinkedIndicator,
  StyledEmptyState,
  StyledHeaderRow,
  StyledHeaderCell,
} from "./RecurringTransactionList.styles";

interface Props {
  recurringTransactions: RecurringTransaction[];
  onRowClick: (rt: RecurringTransaction) => void;
}

export default function RecurringTransactionList({
  recurringTransactions,
  onRowClick,
}: Props) {
  if (recurringTransactions.length === 0) {
    return <StyledEmptyState>No recurring transactions</StyledEmptyState>;
  }

  return (
    <StyledList>
      <StyledHeaderRow>
        <StyledHeaderCell>Name</StyledHeaderCell>
        <StyledHeaderCell>Amount</StyledHeaderCell>
        <StyledHeaderCell>Frequency</StyledHeaderCell>
        <StyledHeaderCell>Day</StyledHeaderCell>
      </StyledHeaderRow>
      {recurringTransactions.map((rt) => (
        <StyledRow key={rt.id} onClick={() => onRowClick(rt)}>
          <StyledDescription>{rt.description}</StyledDescription>
          <StyledAmount>{formatBalance(rt.amount)}</StyledAmount>
          <StyledMeta>{rt.frequency}</StyledMeta>
          <StyledMeta>{toOrdinal(rt.dayOfMonth)}</StyledMeta>
          {rt.linkedAccountId && (
            <StyledLinkedIndicator data-testid="linked-account-indicator" />
          )}
        </StyledRow>
      ))}
    </StyledList>
  );
}
