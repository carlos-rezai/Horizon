import styled from "styled-components";

export const StyledSection = styled.section`
  margin-top: ${({ theme }) => theme.spacing.space6}px;
`;

export const StyledChartWrapper = styled.div`
  margin-top: ${({ theme }) => theme.spacing.space3}px;
  width: 100%;
`;

export const StyledEmptyState = styled.p`
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;
  margin-top: ${({ theme }) => theme.spacing.space3}px;
`;

export const StyledLoadingState = styled.p`
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;
  margin-top: ${({ theme }) => theme.spacing.space3}px;
`;

export const StyledPayoffMarker = styled.span`
  display: inline-block;
  margin-top: ${({ theme }) => theme.spacing.space2}px;
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;
  color: ${({ theme }) => theme.colors.tertiary};
`;

export const StyledTooltipBox = styled.div`
  background: ${({ theme }) => theme.colors.surfaceContainerHigh};
  border: 1px solid ${({ theme }) => theme.colors.outlineVariant};
  border-radius: ${({ theme }) => theme.radius.sm}px;
  padding: ${({ theme }) => theme.spacing.space2}px
    ${({ theme }) => theme.spacing.space3}px;
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;
  color: ${({ theme }) => theme.colors.onSurface};
`;

export const StyledTooltipLabel = styled.div`
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
  margin-bottom: ${({ theme }) => theme.spacing.space1}px;
`;

export const StyledTooltipRowPositive = styled.div`
  color: ${({ theme }) => theme.colors.secondary};
`;

export const StyledTooltipRowWarning = styled.div`
  color: ${({ theme }) => theme.colors.tertiary};
`;

export const StyledTooltipRowAccent = styled.div`
  color: ${({ theme }) => theme.colors.primary};
`;

export const StyledTooltipRowMuted = styled.div`
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
`;

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
