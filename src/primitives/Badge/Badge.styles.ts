import styled from "styled-components";
import type { AccountKind } from "../../types/account";

const kindColors: Record<AccountKind, { bg: string; text: string }> = {
  Girokonto: { bg: "rgba(74, 158, 255, 0.15)", text: "#4A9EFF" },
  Tagesgeld: { bg: "rgba(76, 175, 125, 0.15)", text: "#4CAF7D" },
  Mortgage: { bg: "rgba(224, 92, 92, 0.15)", text: "#E05C5C" },
  CreditCard: { bg: "rgba(255, 193, 7, 0.15)", text: "#FFC107" },
  Investment: { bg: "rgba(139, 144, 167, 0.15)", text: "#8B90A7" },
};

export const StyledBadge = styled.span`
  display: inline-block;
  padding: 2px ${({ theme }) => theme.spacing.space2}px;
  border-radius: 4px;
  font-size: ${({ theme }) => theme.typography.sizes.xs}px;
  font-weight: ${({ theme }) => theme.typography.weights.medium};
  line-height: ${({ theme }) => theme.typography.lineHeights.tight};

  ${Object.entries(kindColors)
    .map(
      ([kind, { bg, text }]) => `
    &[data-kind="${kind}"] {
      background-color: ${bg};
      color: ${text};
    }
  `
    )
    .join("")}
`;
