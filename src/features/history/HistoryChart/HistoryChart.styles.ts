import styled from "styled-components";

export const StyledCard = styled.section`
  margin-top: ${({ theme }) => theme.spacing.space5}px;
  background-color: ${({ theme }) => theme.colors.surfaceContainer};
  border: 1px solid ${({ theme }) => theme.colors.outlineVariant};
  border-radius: ${({ theme }) => theme.radius.card}px;
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.05);
  padding: 24px;
`;

export const StyledHeader = styled.div`
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.space4}px;
  margin-bottom: 8px;
`;

export const StyledOverline = styled.div`
  font-family: ${({ theme }) => theme.typography.scale.label.fontFamily};
  font-size: ${({ theme }) => theme.typography.scale.label.fontSize};
  font-weight: ${({ theme }) => theme.typography.scale.label.fontWeight};
  letter-spacing: ${({ theme }) => theme.typography.scale.label.letterSpacing};
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.primary};
  margin-bottom: 7px;
`;

export const StyledTitle = styled.div`
  font-family: ${({ theme }) => theme.typography.scale.h1.fontFamily};
  font-size: ${({ theme }) => theme.typography.scale.h1.fontSize};
  font-weight: ${({ theme }) => theme.typography.scale.h1.fontWeight};
  line-height: ${({ theme }) => theme.typography.scale.h1.lineHeight};
  letter-spacing: ${({ theme }) => theme.typography.scale.h1.letterSpacing};
  color: ${({ theme }) => theme.colors.onSurface};
`;

export const StyledSeriesToggle = styled.div`
  display: flex;
  align-items: center;
  gap: 8px;
  align-self: flex-end;
  font-family: ${({ theme }) => theme.typography.scale.body.fontFamily};
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.onSurfaceDim};
`;

export const StyledRangeChips = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 3px;
  background: ${({ theme }) => theme.colors.surfaceContainerLow};
  border: 1px solid ${({ theme }) => theme.colors.outlineVariant};
  border-radius: ${({ theme }) => theme.radius.md}px;
  padding: 3px;
`;

export const StyledRangeChip = styled.button<{ $active: boolean }>`
  padding: 7px 14px;
  border: none;
  border-radius: 7px;
  font-family: ${({ theme }) => theme.typography.scale.body.fontFamily};
  font-size: 13px;
  font-weight: ${({ $active }) => ($active ? 600 : 500)};
  color: ${({ $active, theme }) =>
    $active ? theme.colors.onPrimary : theme.colors.onSurfaceVariant};
  background: ${({ $active, theme }) =>
    $active ? theme.colors.primary : "transparent"};
  cursor: pointer;
  transition: all 0.14s ease;
`;

export const StyledChartWrapper = styled.div`
  margin-top: ${({ theme }) => theme.spacing.space3}px;
  width: 100%;
`;

export const StyledLoadingState = styled.p`
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;
  margin-top: ${({ theme }) => theme.spacing.space3}px;
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

export const StyledTooltipRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.space4}px;
  margin-top: ${({ theme }) => theme.spacing.space1}px;
`;

export const StyledTooltipRowLabel = styled.span`
  display: inline-flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space2}px;
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
`;

export const StyledTooltipSwatch = styled.span<{ $color: string }>`
  width: 7px;
  height: 7px;
  border-radius: 999px;
  flex-shrink: 0;
  background: ${({ $color }) => $color};
`;

export const StyledTooltipNetRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.space4}px;
  margin-top: ${({ theme }) => theme.spacing.space2}px;
  padding-top: ${({ theme }) => theme.spacing.space2}px;
  border-top: 1px solid ${({ theme }) => theme.colors.outlineVariant};
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
