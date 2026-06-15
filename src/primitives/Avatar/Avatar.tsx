import * as LucideIcons from "lucide-react";
import type { LucideProps } from "lucide-react";
import type { AccountKind } from "../../types/account";
import { resolveAccountColor } from "../../utils/color/color";
import { StyledAvatar } from "./Avatar.styles";

interface AvatarAccount {
  kind: AccountKind;
  icon?: string | null;
  color?: string | null;
}

interface AvatarProps {
  account: AvatarAccount;
  /** Box size in pixels. Defaults to 36. */
  size?: number;
}

// Per-kind default icon, used when the account has no valid custom icon — so
// the avatar always shows a meaningful glyph in the account colour.
const KIND_ICON: Record<AccountKind, string> = {
  Girokonto: "Landmark",
  Tagesgeld: "PiggyBank",
  Mortgage: "Home",
  CreditCard: "CreditCard",
  Investment: "TrendingUp",
};

export default function Avatar({ account, size = 36 }: AvatarProps) {
  const color = resolveAccountColor({
    color: account.color,
    kind: account.kind,
  });

  const customIcon =
    account.icon &&
    (LucideIcons[account.icon as keyof typeof LucideIcons] as
      | React.ComponentType<LucideProps>
      | undefined);
  const Icon = (customIcon ||
    (LucideIcons[
      KIND_ICON[account.kind] as keyof typeof LucideIcons
    ] as React.ComponentType<LucideProps>)) as
    | React.ComponentType<LucideProps>
    | undefined;

  return (
    <StyledAvatar data-testid="avatar" $color={color} $size={size}>
      {Icon ? <Icon size={Math.round(size * 0.5)} /> : null}
    </StyledAvatar>
  );
}
