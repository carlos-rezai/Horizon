import styled from "styled-components";

export const StyledHeader = styled.header`
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space4}px;
  padding: ${({ theme }) => theme.spacing.space4}px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.outlineVariant};
  margin-bottom: ${({ theme }) => theme.spacing.space6}px;
`;

export const StyledAccountName = styled.span`
  font-size: ${({ theme }) => theme.typography.sizes.lg}px;
  font-weight: ${({ theme }) => theme.typography.weights.semibold};
  color: ${({ theme }) => theme.colors.onSurface};
  flex: 1;
`;

export const StyledBalance = styled.span`
  font-size: ${({ theme }) => theme.typography.sizes.lg}px;
  font-weight: ${({ theme }) => theme.typography.weights.semibold};
  color: ${({ theme }) => theme.colors.onSurface};
  font-variant-numeric: tabular-nums;
`;

export const StyledActions = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space2}px;
`;

export const StyledErrorText = styled.p`
  width: 100%;
  color: ${({ theme }) => theme.colors.error};
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;
  margin: 0;
`;

export const StyledConfirmRow = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space2}px;
`;
