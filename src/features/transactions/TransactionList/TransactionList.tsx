import type { Transaction } from "../../../types/transaction";
import { centsToEuros } from "../../../utils/currency/currency";
import {
  StyledList,
  StyledRow,
  StyledDate,
  StyledAmount,
  StyledDescription,
  StyledTransferBadge,
  StyledAutoSettlementBadge,
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
        <StyledRow
          key={tx.id}
          onClick={
            tx.isAutoSettlement ? undefined : () => onTransactionClick?.(tx)
          }
          style={tx.isAutoSettlement ? { cursor: "default" } : undefined}
        >
          <StyledDate>{tx.date}</StyledDate>
          <StyledDescription>{tx.description}</StyledDescription>
          <StyledAmount>{centsToEuros(tx.amount)}</StyledAmount>
          {tx.isAutoSettlement ? (
            <StyledAutoSettlementBadge aria-label="auto-settlement">
              Auto-settlement
            </StyledAutoSettlementBadge>
          ) : tx.transferId ? (
            <StyledTransferBadge
              data-testid="transfer-indicator"
              aria-label="transfer"
            >
              Transfer
            </StyledTransferBadge>
          ) : null}
        </StyledRow>
      ))}
    </StyledList>
  );
}
