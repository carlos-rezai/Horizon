import styled from "styled-components";

export const StyledSection = styled.section`
  margin-top: ${({ theme }) => theme.spacing.space6}px;
`;

export const StyledChartWrapper = styled.div`
  margin-top: ${({ theme }) => theme.spacing.space3}px;
  width: 100%;
`;

export const StyledEmptyState = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;
  margin-top: ${({ theme }) => theme.spacing.space3}px;
`;

export const StyledLoadingState = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;
  margin-top: ${({ theme }) => theme.spacing.space3}px;
`;

export const StyledPayoffMarker = styled.span`
  display: inline-block;
  margin-top: ${({ theme }) => theme.spacing.space2}px;
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;
  color: ${({ theme }) => theme.colors.warning};
`;

export const StyledTooltipBox = styled.div`
  background: ${({ theme }) => theme.colors.bgElevated};
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: ${({ theme }) => theme.radius.sm}px;
  padding: ${({ theme }) => theme.spacing.space2}px
    ${({ theme }) => theme.spacing.space3}px;
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

export const StyledTooltipLabel = styled.div`
  color: ${({ theme }) => theme.colors.textMuted};
  margin-bottom: ${({ theme }) => theme.spacing.space1}px;
`;

export const StyledTooltipRowPositive = styled.div`
  color: ${({ theme }) => theme.colors.positive};
`;

export const StyledTooltipRowWarning = styled.div`
  color: ${({ theme }) => theme.colors.warning};
`;

export const StyledTooltipRowAccent = styled.div`
  color: ${({ theme }) => theme.colors.accent};
`;

export const StyledTooltipRowMuted = styled.div`
  color: ${({ theme }) => theme.colors.textMuted};
`;
