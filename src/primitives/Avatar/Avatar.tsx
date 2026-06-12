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

export default function Avatar({ account, size = 36 }: AvatarProps) {
  const color = resolveAccountColor({
    color: account.color,
    kind: account.kind,
  });

  const Icon = account.icon
    ? (LucideIcons[account.icon as keyof typeof LucideIcons] as
        | React.ComponentType<LucideProps>
        | undefined)
    : undefined;

  return (
    <StyledAvatar data-testid="avatar" $color={color} $size={size}>
      {Icon ? <Icon size={Math.round(size * 0.5)} /> : null}
    </StyledAvatar>
  );
}
