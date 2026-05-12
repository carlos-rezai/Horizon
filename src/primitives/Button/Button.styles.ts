import styled, { css } from "styled-components";

type Variant = "primary" | "secondary" | "danger";

export const StyledButton = styled.button<{ $variant: Variant }>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: ${({ theme }) => theme.spacing.space2}px
    ${({ theme }) => theme.spacing.space4}px;
  border-radius: ${({ theme }) => theme.radius.button}px;
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;
  font-weight: ${({ theme }) => theme.typography.weights.medium};
  line-height: 1;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid transparent;

  ${({ $variant, theme }) =>
    $variant === "primary" &&
    css`
      background-color: ${theme.colors.primaryContainer};
      color: ${theme.colors.onPrimary};
      border-color: ${theme.colors.primaryContainer};
    `}

  ${({ $variant, theme }) =>
    $variant === "secondary" &&
    css`
      background-color: transparent;
      color: ${theme.colors.onSurface};
      border-color: ${theme.colors.outlineVariant};
    `}

  ${({ $variant, theme }) =>
    $variant === "danger" &&
    css`
      background-color: ${theme.colors.error};
      color: ${theme.colors.onError};
      border-color: ${theme.colors.error};
    `}

  &:focus-visible {
    outline: 2px solid ${({ theme }) => theme.colors.primary};
    outline-offset: 2px;
  }

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;
