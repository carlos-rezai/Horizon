import type { Transaction } from "../../../types/transaction";
import { centsToEuros } from "../../../utils/currency/currency";
import {
  StyledList,
  StyledRow,
  StyledDate,
  StyledAmount,
  StyledDescription,
  StyledTransferBadge,
  StyledEmptyState,
} from "./TransactionList.styles";

interface Props {
  transactions: Transaction[];
  onTransactionClick?: (tx: Transaction) => void;
}

export default function TransactionList({
  transactions,
  onTransactionClick,
}: Props) {
  if (transactions.length === 0) {
    return <StyledEmptyState>No transactions</StyledEmptyState>;
  }

  return (
    <StyledList>
      {transactions.map((tx) => (
        <StyledRow key={tx.id} onClick={() => onTransactionClick?.(tx)}>
          <StyledDate>{tx.date}</StyledDate>
          <StyledDescription>{tx.description}</StyledDescription>
          <StyledAmount>{centsToEuros(tx.amount)}</StyledAmount>
          {tx.transferId && (
            <StyledTransferBadge
              data-testid="transfer-indicator"
              aria-label="transfer"
            >
              Transfer
            </StyledTransferBadge>
          )}
        </StyledRow>
      ))}
    </StyledList>
  );
}
