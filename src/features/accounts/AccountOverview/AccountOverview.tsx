import { Link } from "react-router-dom";
import type { AccountWithBalance, AccountKind } from "../../../types/account";

interface Props {
  accounts: AccountWithBalance[];
}

const LIABILITY_KINDS = new Set<AccountKind>(["Mortgage", "CreditCard"]);

function formatBalance(cents: number): string {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export default function AccountOverview({ accounts }: Props) {
  if (accounts.length === 0) {
    return <p>No accounts yet.</p>;
  }

  return (
    <ul>
      {accounts.map((account) => (
        <li
          key={account._id}
          data-liability={LIABILITY_KINDS.has(account.kind)}
        >
          <Link to={`/accounts/${account._id}`}>
            <span>{account.name}</span>
            <span>{account.kind}</span>
            <span>{formatBalance(account.balance)}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
