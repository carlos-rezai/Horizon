import styled from "styled-components";

export const StyledSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.space4}px;
`;

export const StyledCard = styled.div`
  background-color: ${({ theme }) => theme.colors.surfaceContainer};
  border: 1px solid ${({ theme }) => theme.colors.outlineVariant};
  border-radius: 8px;
  padding: ${({ theme }) => theme.spacing.space4}px;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.space2}px;
`;

export const StyledRestschuld = styled.p`
  font-size: ${({ theme }) => theme.typography.sizes.lg}px;
  font-weight: ${({ theme }) => theme.typography.weights.semibold};
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.error};
  margin: 0;
`;

export const StyledCountdownText = styled.p`
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
  margin: 0;
`;

export const StyledProgressTrack = styled.div`
  width: 100%;
  height: 4px;
  background-color: ${({ theme }) => theme.colors.surfaceContainerHighest};
  border-radius: 2px;
  overflow: hidden;
`;

export const StyledProgressFill = styled.div<{ $percent: number }>`
  height: 100%;
  width: ${({ $percent }) => $percent}%;
  background-color: ${({ theme }) => theme.colors.tertiary};
  border-radius: 2px;
`;
