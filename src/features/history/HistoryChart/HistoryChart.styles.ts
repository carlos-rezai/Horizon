import styled from "styled-components";

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
