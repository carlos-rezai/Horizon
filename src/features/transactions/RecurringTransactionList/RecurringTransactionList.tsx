import type { RecurringTransaction } from "../../../types/recurring";
import { formatBalance } from "../../../utils/format";

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
    return <p>No recurring transactions</p>;
  }

  return (
    <ul>
      {recurringTransactions.map((rt) => (
        <li
          key={rt._id}
          data-inactive={rt.isActive ? undefined : "true"}
          onClick={() => onRowClick(rt)}
          style={{ cursor: "pointer" }}
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
          <span>{rt.description}</span>
          <span>{formatBalance(rt.amount)}</span>
          <span>{rt.frequency}</span>
          <span>{rt.dayOfMonth}</span>
          {rt.linkedAccountId && (
            <span data-testid="linked-account-indicator" />
          )}
        </li>
      ))}
    </ul>
  );
}
