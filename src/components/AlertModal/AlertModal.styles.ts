import styled, { css, type DefaultTheme } from "styled-components";
import type { AlertTone } from "./AlertModal";

const toneColor = (theme: DefaultTheme, tone: AlertTone): string => {
  switch (tone) {
    case "success":
      return theme.colors.secondary;
    case "warning":
      return theme.colors.tertiary;
    case "error":
      return theme.colors.error;
    case "info":
    default:
      return theme.colors.primary;
  }
};

export const StyledMessage = styled.p<{ $tone: AlertTone }>`
  margin: 0;
  padding-left: ${({ theme }) => theme.spacing.space3}px;
  border-left: 3px solid ${({ $tone, theme }) => toneColor(theme, $tone)};
  font-size: ${({ theme }) => theme.typography.sizes.md}px;
  color: ${({ theme }) => theme.colors.onSurface};
`;

export const StyledDetail = styled.p`
  ${({ theme }) => css`
    margin: ${theme.spacing.space3}px 0 0;
    font-size: ${theme.typography.sizes.sm}px;
    color: ${theme.colors.onSurfaceVariant};
    white-space: pre-wrap;
    word-break: break-word;
  `}
`;
