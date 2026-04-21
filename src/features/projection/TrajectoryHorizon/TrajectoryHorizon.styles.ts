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
