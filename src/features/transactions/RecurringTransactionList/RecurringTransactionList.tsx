import type { AccountWithBalance } from "../../../types/account";
import type { RecurringTransaction } from "../../../types/recurring";
import { formatBalance, toOrdinal } from "../../../utils/format/format";
import {
  StyledList,
  StyledRow,
  StyledDescription,
  StyledAmount,
  StyledToAccount,
  StyledMeta,
  StyledEmptyState,
  StyledHeaderRow,
  StyledHeaderCell,
} from "./RecurringTransactionList.styles";

interface Props {
  recurringTransactions: RecurringTransaction[];
  accounts?: AccountWithBalance[];
  onRowClick: (rt: RecurringTransaction) => void;
}

export default function RecurringTransactionList({
  recurringTransactions,
  accounts = [],
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
        <StyledHeaderCell>To account</StyledHeaderCell>
      </StyledHeaderRow>
      {recurringTransactions.map((rt) => {
        const toAccountName = rt.linkedAccountId
          ? (accounts.find((a) => a.id === rt.linkedAccountId)?.name ?? "—")
          : "—";
        return (
          <StyledRow key={rt.id} onClick={() => onRowClick(rt)}>
            <StyledDescription>{rt.description}</StyledDescription>
            <StyledAmount>{formatBalance(rt.amount)}</StyledAmount>
            <StyledMeta>{rt.frequency}</StyledMeta>
            <StyledMeta>{toOrdinal(rt.dayOfMonth)}</StyledMeta>
            <StyledToAccount>{toAccountName}</StyledToAccount>
          </StyledRow>
        );
      })}
    </StyledList>
  );
}
