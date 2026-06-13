import styled, { css } from "styled-components";

type Variant = "info" | "success" | "warning" | "error";

export const StyledSnackbar = styled.div<{
  $variant: Variant;
  $positioned?: boolean;
}>`
  ${({ $positioned = true, theme }) =>
    $positioned
      ? css`
          position: fixed;
          bottom: ${theme.spacing.space6}px;
          right: ${theme.spacing.space6}px;
          z-index: 1000;
        `
      : css`
          position: relative;
        `}
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space3}px;
  padding: ${({ theme }) => theme.spacing.space3}px
    ${({ theme }) => theme.spacing.space4}px;
  border-radius: ${({ theme }) => theme.radius.card}px;
  border: 1px solid;
  min-width: 280px;
  max-width: 480px;
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;

  ${({ $variant, theme }) =>
    $variant === "info" &&
    css`
      background-color: ${theme.colors.primaryTint};
      border-color: ${theme.colors.primary};
      color: ${theme.colors.primary};
    `}

  ${({ $variant, theme }) =>
    $variant === "success" &&
    css`
      background-color: ${theme.colors.secondaryTint};
      border-color: ${theme.colors.secondary};
      color: ${theme.colors.secondary};
    `}

  ${({ $variant, theme }) =>
    $variant === "warning" &&
    css`
      background-color: ${theme.colors.tertiaryTint};
      border-color: ${theme.colors.tertiary};
      color: ${theme.colors.tertiary};
    `}

  ${({ $variant, theme }) =>
    $variant === "error" &&
    css`
      background-color: ${theme.colors.errorTint};
      border-color: ${theme.colors.error};
      color: ${theme.colors.error};
    `}
`;

export const StyledMessage = styled.span`
  flex: 1;
`;

export const StyledActionButton = styled.button`
  background: none;
  border: none;
  padding: ${({ theme }) => theme.spacing.space1}px
    ${({ theme }) => theme.spacing.space2}px;
  cursor: pointer;
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;
  font-weight: ${({ theme }) => theme.typography.weights.medium};
  color: inherit;
  border-radius: ${({ theme }) => theme.radius.sm}px;

  &:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }
`;

export const StyledCloseButton = styled.button`
  background: none;
  border: none;
  padding: ${({ theme }) => theme.spacing.space1}px;
  cursor: pointer;
  color: inherit;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: ${({ theme }) => theme.radius.sm}px;
  line-height: 1;

  &:focus-visible {
    outline: 2px solid currentColor;
    outline-offset: 2px;
  }
`;
