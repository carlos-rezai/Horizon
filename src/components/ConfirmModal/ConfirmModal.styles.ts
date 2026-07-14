import styled, { css, type DefaultTheme } from "styled-components";
import type { ConfirmTone } from "./ConfirmModal";

const accentColor = (theme: DefaultTheme, tone: ConfirmTone): string =>
  tone === "danger" ? theme.colors.error : theme.colors.primary;

export const StyledMessage = styled.p<{ $tone: ConfirmTone }>`
  margin: 0;
  padding-left: ${({ theme }) => theme.spacing.space3}px;
  border-left: 3px solid ${({ $tone, theme }) => accentColor(theme, $tone)};
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
