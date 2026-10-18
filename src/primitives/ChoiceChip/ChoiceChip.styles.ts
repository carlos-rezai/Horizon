import styled from "styled-components";
import { focusRing } from "../focusRing/focusRing";

export const StyledChoiceChip = styled.button<{ $active: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: 7px;
  height: ${({ theme }) => theme.sizing.control.sm}px;
  padding: 0 ${({ theme }) => theme.spacing.space3}px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  font-family: ${({ theme }) => theme.typography.fontFamily.ui};
  font-size: 13px;
  font-weight: ${({ theme }) => theme.typography.weights.medium};
  cursor: pointer;
  transition: all 0.14s ease;
  background: ${({ $active, theme }) =>
    $active
      ? theme.colors.primaryContainer
      : theme.colors.surfaceContainerLowest};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.onSurface : theme.colors.onSurfaceVariant};
  border: 1px solid
    ${({ $active, theme }) =>
      $active ? theme.colors.primary : theme.colors.outlineVariant};

  &:disabled {
    cursor: default;
  }

  ${focusRing}
`;

export const StyledDot = styled.span<{ $color: string }>`
  width: 9px;
  height: 9px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  background: ${({ $color }) => $color};
  flex-shrink: 0;
`;
