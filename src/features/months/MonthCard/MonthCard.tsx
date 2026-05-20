import { Link } from "react-router-dom";
import { formatBalance, formatMonth } from "../../../utils/format/format";
import { useAllMonthTransactions } from "../useAllMonthTransactions";
import {
  StyledMonthCard,
  StyledTotalSpent,
  StyledTransactionCount,
  StyledCategoryBar,
  StyledCategorySegment,
  StyledEmptyState,
} from "./MonthCard.styles";

interface Props {
  month: string;
  accountIds: string[];
}

export default function MonthCard({ month, accountIds }: Props) {
  const { transactions } = useAllMonthTransactions(accountIds, month);

  const spending = transactions.filter((t) => t.amount < 0);
  const totalSpentCents = spending.reduce(
    (sum, t) => sum + Math.abs(t.amount),
    0
  );

  const categoryTotals = spending.reduce<Record<string, number>>((acc, t) => {
    acc[t.category] = (acc[t.category] ?? 0) + Math.abs(t.amount);
    return acc;
  }, {});

  const hasTransactions = transactions.length > 0;

  return (
    <StyledMonthCard>
      <Link to={`/months/${month}`}>{formatMonth(month)}</Link>
      {hasTransactions ? (
        <>
          <StyledTotalSpent>{formatBalance(totalSpentCents)}</StyledTotalSpent>
          <StyledTransactionCount data-testid="transaction-count">
            {transactions.length} transactions
          </StyledTransactionCount>
          <StyledCategoryBar>
            {Object.entries(categoryTotals).map(([category, total]) => (
              <StyledCategorySegment
                key={category}
                data-testid={`category-segment-${category}`}
                $flex={total / totalSpentCents}
              />
            ))}
          </StyledCategoryBar>
        </>
      ) : (
        <StyledEmptyState>No transactions</StyledEmptyState>
      )}
    </StyledMonthCard>
  );
}
