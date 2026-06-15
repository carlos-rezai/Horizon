import React from "react";
import type { AccountKind } from "../../types/account";
import { StyledBadge, StyledTag } from "./Badge.styles";

export type BadgeTone = "neutral" | "accent" | "pos" | "neg";

/**
 * Badge has two shapes:
 * - `kind` mode renders an account-kind pill in that kind's colour.
 * - generic mode renders arbitrary children tinted by an explicit `color`
 *   (e.g. a category swatch) or a semantic `tone` (e.g. the "Planned" accent).
 */
type BadgeProps =
  | { kind: AccountKind }
  | { tone?: BadgeTone; color?: string; children: React.ReactNode };

export default function Badge(props: BadgeProps) {
  if ("kind" in props) {
    return <StyledBadge $kind={props.kind}>{props.kind}</StyledBadge>;
  }

  const { tone = "neutral", color, children } = props;
  return (
    <StyledTag $tone={tone} $color={color}>
      {children}
    </StyledTag>
  );
}
