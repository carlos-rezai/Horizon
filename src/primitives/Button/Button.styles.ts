import styled, { css } from "styled-components";
import type { ControlSize } from "../../tokens";
import { focusRing } from "../focusRing/focusRing";

type Variant = "primary" | "secondary" | "danger" | "ghost" | "ghostDanger";

export const StyledButton = styled.button<{
  $variant: Variant;
  $size: ControlSize;
  $iconOnly: boolean;
}>`
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: ${({ theme }) => theme.spacing.space2}px;
  height: ${({ $size, theme }) => theme.sizing.control[$size]}px;
  padding: ${({ $iconOnly, theme }) =>
    $iconOnly ? "0" : `0 ${theme.spacing.space4}px`};
  ${({ $iconOnly, $size, theme }) =>
    $iconOnly &&
    css`
      width: ${theme.sizing.control[$size]}px;
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

  ${({ $variant, theme }) =>
    $variant === "ghostDanger" &&
    css`
      background-color: transparent;
      color: ${theme.colors.onSurfaceVariant};
      border-color: transparent;

      &:hover:not(:disabled) {
        color: ${theme.colors.error};
      }
    `}

  ${focusRing}

  &:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
`;
