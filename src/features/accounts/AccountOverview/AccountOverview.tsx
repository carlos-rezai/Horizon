import { Link } from "react-router-dom";
import type { AccountWithBalance, AccountKind } from "../../../types/account";
import Badge from "../../../primitives/Badge/Badge";
import {
  StyledList,
  StyledAccountLink,
  StyledAccountName,
  StyledBalance,
  StyledEmptyState,
} from "./AccountOverview.styles";

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
    return <StyledEmptyState>No accounts yet.</StyledEmptyState>;
  }

  return (
    <StyledList>
      {accounts.map((account) => {
        const isLiability = LIABILITY_KINDS.has(account.kind);
        return (
          <li key={account._id}>
            <StyledAccountLink as={Link} to={`/accounts/${account._id}`}>
              <StyledAccountName>{account.name}</StyledAccountName>
              <Badge kind={account.kind} />
              <StyledBalance $isLiability={isLiability}>
                {formatBalance(account.balance)}
              </StyledBalance>
            </StyledAccountLink>
          </li>
        );
      })}
    </StyledList>
  );
}
