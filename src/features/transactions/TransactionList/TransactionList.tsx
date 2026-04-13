import type { Transaction } from "../../../types/transaction";
import { centsToEuros } from "../../../utils/currency";

interface Props {
  transactions: Transaction[];
}

export default function TransactionList({ transactions }: Props) {
  if (transactions.length === 0) {
    return <p>No transactions</p>;
  }

  return (
    <ul>
      {transactions.map((tx) => (
        <li key={tx._id}>
          <span>{tx.date}</span>
          <span>{centsToEuros(tx.amount)}</span>
          <span>{tx.description}</span>
          <span>{tx.category}</span>
          {tx.transferId && (
            <span data-testid="transfer-indicator" aria-label="transfer" />
          )}
        </li>
      ))}
    </ul>
  );
}
