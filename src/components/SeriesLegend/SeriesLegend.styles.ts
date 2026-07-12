import styled from "styled-components";

export const StyledLegend = styled.div`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space2}px;
  margin-top: ${({ theme }) => theme.spacing.space3}px;
  padding-top: ${({ theme }) => theme.spacing.space3}px;
  border-top: 1px solid ${({ theme }) => theme.colors.outlineVariant};
`;

export const StyledChip = styled.button<{ $on: boolean }>`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space2}px;
  padding: ${({ theme }) => theme.spacing.space1}px
    ${({ theme }) => theme.spacing.space3}px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  background: ${({ $on, theme }) =>
    $on ? theme.colors.surfaceContainerHigh : "transparent"};
  border: 1px solid
    ${({ $on, theme }) =>
      $on ? theme.colors.outlineVariant : theme.colors.lineFaint};
  color: ${({ $on, theme }) =>
    $on ? theme.colors.onSurface : theme.colors.onSurfaceFaint};
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;
  font-weight: 500;
  cursor: pointer;
  opacity: ${({ $on }) => ($on ? 1 : 0.6)};
  transition: all 0.14s ease;
`;

export const StyledChipSwatch = styled.span<{
  $color: string;
  $on: boolean;
  $dashed: boolean;
}>`
  width: 16px;
  height: ${({ $dashed }) => ($dashed ? 0 : 3)}px;
  border-radius: 2px;
  flex-shrink: 0;
  border-top: ${({ $dashed, $on, $color, theme }) =>
    $dashed
      ? `2px dashed ${$on ? $color : theme.colors.onSurfaceFaint}`
      : "none"};
  background: ${({ $dashed, $on, $color, theme }) =>
    $dashed ? "transparent" : $on ? $color : theme.colors.onSurfaceFaint};
`;

export const StyledSumBadge = styled.span<{ $on: boolean }>`
  font-size: ${({ theme }) => theme.typography.sizes.xs}px;
  letter-spacing: 0.08em;
  color: ${({ $on, theme }) =>
    $on ? theme.colors.primary : theme.colors.onSurfaceFaint};
`;

export const StyledShowAllButton = styled.button`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space1}px;
  padding: ${({ theme }) => theme.spacing.space1}px
    ${({ theme }) => theme.spacing.space3}px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  background: transparent;
  border: 1px dashed ${({ theme }) => theme.colors.accentLine};
  color: ${({ theme }) => theme.colors.primary};
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;
  font-weight: 600;
  cursor: pointer;
`;
