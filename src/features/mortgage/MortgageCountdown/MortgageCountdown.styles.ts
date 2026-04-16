import styled from "styled-components";

export const StyledSection = styled.section`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.space4}px;
`;

export const StyledCard = styled.div`
  background-color: ${({ theme }) => theme.colors.bgSurface};
  border: 1px solid ${({ theme }) => theme.colors.border};
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
  color: ${({ theme }) => theme.colors.negative};
  margin: 0;
`;

export const StyledCountdownText = styled.p`
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;
  color: ${({ theme }) => theme.colors.textMuted};
  margin: 0;
`;
