import styled from "styled-components";

export const StyledChartWrapper = styled.div`
  margin-top: ${({ theme }) => theme.spacing.space3}px;
  width: 100%;
`;

export const StyledNote = styled.p`
  margin: ${({ theme }) => theme.spacing.space3}px 0 0;
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
`;

export const StyledTooltipRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: ${({ theme }) => theme.spacing.space4}px;
  margin-top: ${({ theme }) => theme.spacing.space1}px;
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
`;

export const StyledMetricToggle = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.space2}px;
`;
