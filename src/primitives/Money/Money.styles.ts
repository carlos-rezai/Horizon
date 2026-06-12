import styled, { css } from "styled-components";

type Tone = "gain" | "loss" | "neutral";

export const StyledMoney = styled.span<{ $tone: Tone }>`
  font-variant-numeric: tabular-nums;

  ${({ $tone, theme }) =>
    $tone === "gain" &&
    css`
      color: ${theme.colors.secondary};
    `}

  ${({ $tone, theme }) =>
    $tone === "loss" &&
    css`
      color: ${theme.colors.error};
    `}
`;
