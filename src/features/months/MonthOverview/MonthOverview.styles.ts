import styled from "styled-components";

export const StyledMonthOverview = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.space4}px;
`;

export const StyledBalanceSummaryBar = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.space4}px;
  padding: ${({ theme }) => theme.spacing.space3}px
    ${({ theme }) => theme.spacing.space4}px;
  background: ${({ theme }) => theme.colors.surfaceVariant};
  border-radius: 8px;
`;

export const StyledBalanceSummaryItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.space1}px;
`;

export const StyledBalanceLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.sizes.xs}px;
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
`;

export const StyledBalanceValue = styled.span`
  font-size: ${({ theme }) => theme.typography.sizes.md}px;
  font-weight: ${({ theme }) => theme.typography.weights.semibold};
  color: ${({ theme }) => theme.colors.onSurface};
`;

export const StyledTabList = styled.div`
  display: flex;
  gap: ${({ theme }) => theme.spacing.space2}px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.outlineVariant};
`;

export const StyledTab = styled.button<{ $isActive: boolean }>`
  background: none;
  border: none;
  border-bottom: 2px solid
    ${({ theme, $isActive }) =>
      $isActive ? theme.colors.primary : "transparent"};
  padding: ${({ theme }) => theme.spacing.space2}px
    ${({ theme }) => theme.spacing.space3}px;
  cursor: pointer;
  color: ${({ theme, $isActive }) =>
    $isActive ? theme.colors.primary : theme.colors.onSurface};
`;

export const StyledSectionHeading = styled.h3`
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;
  font-weight: ${({ theme }) => theme.typography.weights.semibold};
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
  margin: 0;
`;

export const StyledTransactionRow = styled.div`
  display: flex;
  justify-content: space-between;
  padding: ${({ theme }) => theme.spacing.space2}px 0;
  border-bottom: 1px solid ${({ theme }) => theme.colors.outlineVariant};
  color: ${({ theme }) => theme.colors.onSurface};
`;

export const StyledOneOffRow = styled.div<{ $gridTemplate: string }>`
  display: grid;
  grid-template-columns: ${({ $gridTemplate }) => $gridTemplate};
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space4}px;
  padding: ${({ theme }) => theme.spacing.space2}px
    ${({ theme }) => theme.spacing.space4}px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.outlineVariant};
  color: ${({ theme }) => theme.colors.onSurface};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceVariant};
  }

  & > span:last-child {
    text-align: right;
  }
`;

export const StyledEmptyState = styled.p`
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;
  margin: 0;
`;

export const StyledSignedAmount = styled.span<{ $isPositive: boolean }>`
  text-align: right;
  font-variant-numeric: tabular-nums;
  color: ${({ theme, $isPositive }) =>
    $isPositive ? theme.colors.secondary : theme.colors.error};
`;
