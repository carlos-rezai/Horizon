import styled from "styled-components";

export const StyledHeaderControls = styled.div`
  display: flex;
  align-items: center;
  gap: 14px;
  align-self: flex-end;
`;

export const StyledHeaderDivider = styled.span`
  width: 1px;
  height: 14px;
  background: ${({ theme }) => theme.colors.outlineVariant};
`;

export const StyledViewHistoryLink = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  background: transparent;
  border: none;
  padding: 0;
  cursor: pointer;
  font-family: ${({ theme }) => theme.typography.scale.body.fontFamily};
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.onSurfaceDim};
  transition: color 0.14s ease;

  &:hover {
    color: ${({ theme }) => theme.colors.onSurface};
  }
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
