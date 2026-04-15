import styled, { css } from "styled-components";

type Variant = "primary" | "secondary" | "danger";

export const StyledButton = styled.button<{ $variant: Variant }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing.space2}px
    ${({ theme }) => theme.spacing.space4}px;
  border-radius: 6px;
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;
  font-weight: ${({ theme }) => theme.typography.weights.medium};
  line-height: 1;
  cursor: pointer;
  transition: opacity 0.15s ease;
  border: 1px solid transparent;

  ${({ $variant, theme }) =>
    $variant === "primary" &&
    css`
      background-color: ${theme.colors.accent};
      color: ${theme.colors.bgBase};
      border-color: ${theme.colors.accent};
    `}

  ${({ $variant, theme }) =>
    $variant === "secondary" &&
    css`
      background-color: transparent;
      color: ${theme.colors.textPrimary};
      border-color: ${theme.colors.border};
    `}

  ${({ $variant, theme }) =>
    $variant === "danger" &&
    css`
      background-color: ${theme.colors.negative};
      color: ${theme.colors.textPrimary};
      border-color: ${theme.colors.negative};
    `}

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.accent};
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;
