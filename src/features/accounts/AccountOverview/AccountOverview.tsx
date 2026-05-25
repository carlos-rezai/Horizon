import { Link } from "react-router-dom";
import * as LucideIcons from "lucide-react";
import type { LucideProps } from "lucide-react";
import type { AccountWithBalance, AccountKind } from "../../../types/account";
import Badge from "../../../primitives/Badge/Badge";
import { resolveAccountColor } from "../../../utils/color/color";
import {
  StyledList,
  StyledAccountLink,
  StyledAccountName,
  StyledBalance,
  StyledEmptyState,
  StyledIconWrapper,
  StyledAccountAvatar,
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

function AccountIcon({
  icon,
  color,
  kind,
}: {
  icon: string | null | undefined;
  color: string | null | undefined;
  kind: AccountKind;
}) {
  const avatarColor = resolveAccountColor({ color, kind });

  if (!icon) {
    return (
      <StyledAccountAvatar
        $color={avatarColor}
        data-testid="account-icon-fallback"
      />
    );
  }
  const Icon = LucideIcons[icon as keyof typeof LucideIcons] as
    | React.ComponentType<LucideProps>
    | undefined;
  if (!Icon) {
    return (
      <StyledAccountAvatar
        $color={avatarColor}
        data-testid="account-icon-fallback"
      />
    );
  }
  return (
    <StyledIconWrapper data-testid="account-icon" $color={color ?? undefined}>
      <Icon size={18} />
    </StyledIconWrapper>
  );
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
          <li key={account.id}>
            <StyledAccountLink as={Link} to={`/accounts/${account.id}`}>
              <AccountIcon
                icon={account.icon}
                color={account.color}
                kind={account.kind}
              />
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
