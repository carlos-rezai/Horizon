import styled, { css } from "styled-components";

type Variant = "primary" | "secondary" | "danger" | "ghost";
type Size = "sm" | "md" | "lg";

const sizeHeights: Record<Size, number> = {
  sm: 32,
  md: 40,
  lg: 44,
};

export const StyledButton = styled.button<{
  $variant: Variant;
  $size: Size;
  $iconOnly: boolean;
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.space2}px;
  height: ${({ $size }) => sizeHeights[$size]}px;
  padding: ${({ $iconOnly, theme }) =>
    $iconOnly ? "0" : `0 ${theme.spacing.space4}px`};
  ${({ $iconOnly, $size }) =>
    $iconOnly &&
    css`
      width: ${sizeHeights[$size]}px;
    `}
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
      background-color: ${theme.colors.primary};
      color: ${theme.colors.onPrimary};
      border-color: ${theme.colors.primary};
      font-weight: ${theme.typography.weights.semibold};

      &:hover:not(:disabled) {
        background-color: ${theme.colors.onPrimaryContainer};
        border-color: ${theme.colors.onPrimaryContainer};
      }
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

  ${({ $variant, theme }) =>
    $variant === "ghost" &&
    css`
      background-color: transparent;
      color: ${theme.colors.onSurfaceVariant};
      border-color: transparent;
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
