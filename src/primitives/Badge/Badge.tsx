import type { AccountKind } from "../../types/account";
import { StyledBadge } from "./Badge.styles";

interface BadgeProps {
  kind: AccountKind;
}

export default function Badge({ kind }: BadgeProps) {
  return <StyledBadge data-kind={kind}>{kind}</StyledBadge>;
}
