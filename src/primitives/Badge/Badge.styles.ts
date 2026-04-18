import styled from "styled-components";
import type { AccountKind } from "../../types/account";
import type { colors } from "../../tokens/colors";

type ColorKey = keyof typeof colors;

const bgMap: Record<AccountKind, ColorKey> = {
  Girokonto: "accentTint",
  Tagesgeld: "positiveTint",
  Mortgage: "negativeTint",
  CreditCard: "warningTint",
  Investment: "mutedTint",
};

const textMap: Record<AccountKind, ColorKey> = {
  Girokonto: "accent",
  Tagesgeld: "positive",
  Mortgage: "negative",
  CreditCard: "warning",
  Investment: "textMuted",
};

export const StyledBadge = styled.span<{ $kind: AccountKind }>`
  display: inline-block;
  padding: 2px ${({ theme }) => theme.spacing.space2}px;
  border-radius: ${({ theme }) => theme.radius.sm}px;
  font-size: ${({ theme }) => theme.typography.sizes.xs}px;
  font-weight: ${({ theme }) => theme.typography.weights.medium};
  line-height: ${({ theme }) => theme.typography.lineHeights.tight};
  background-color: ${({ $kind, theme }) => theme.colors[bgMap[$kind]]};
  color: ${({ $kind, theme }) => theme.colors[textMap[$kind]]};
`;
