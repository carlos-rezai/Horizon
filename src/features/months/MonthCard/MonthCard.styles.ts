import styled from "styled-components";

export const StyledMonthCard = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.space2}px;
`;

export const StyledTotalSpent = styled.span`
  font-size: ${({ theme }) => theme.typography.sizes.lg}px;
  font-weight: ${({ theme }) => theme.typography.weights.semibold};
  color: ${({ theme }) => theme.colors.onSurface};
`;

export const StyledTransactionCount = styled.span`
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
`;

export const StyledCategoryBar = styled.div`
  display: flex;
  height: 4px;
  border-radius: ${({ theme }) => theme.radius.badge}px;
  overflow: hidden;
  background: ${({ theme }) => theme.colors.surfaceContainerHighest};
`;

export const StyledCategorySegment = styled.div<{ $flex: number }>`
  flex: ${({ $flex }) => $flex};
  background: ${({ theme }) => theme.colors.primary};
`;

export const StyledEmptyState = styled.span`
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
`;
