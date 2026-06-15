import styled from "styled-components";

export const StyledSection = styled.section`
  margin-top: ${({ theme }) => theme.spacing.space6}px;
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

// The payoff is shown visually by the chart's Payoff reference line + flag and
// the To-Payoff KPI tile (matching the prototype). This element is retained,
// visually hidden, as a stable hook for the payoff-present assertion.
export const StyledPayoffMarker = styled.span`
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
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
