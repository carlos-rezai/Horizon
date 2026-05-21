import styled from "styled-components";

export const StyledList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

export const StyledRow = styled.li`
  display: grid;
  grid-template-columns: 1fr 120px 100px 60px 160px;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space4}px;
  padding: ${({ theme }) => theme.spacing.space2}px
    ${({ theme }) => theme.spacing.space4}px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.outlineVariant};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceContainerHigh};
  }
`;

export const StyledDescription = styled.span`
  color: ${({ theme }) => theme.colors.onSurface};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const StyledAmount = styled.span<{ $isPositive: boolean }>`
  text-align: right;
  font-variant-numeric: tabular-nums;
  color: ${({ theme, $isPositive }) =>
    $isPositive ? theme.colors.secondary : theme.colors.error};
`;

export const StyledToAccount = styled.span`
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const StyledMeta = styled.span`
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;
`;

export const StyledHeaderRow = styled.li`
  display: grid;
  grid-template-columns: 1fr 120px 100px 60px 160px;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space4}px;
  padding: ${({ theme }) => theme.spacing.space2}px
    ${({ theme }) => theme.spacing.space4}px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.outline};
`;

export const StyledHeaderCell = styled.span`
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
  font-size: ${({ theme }) => theme.typography.sizes.xs}px;
  font-weight: ${({ theme }) => theme.typography.weights.semibold};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;

export const StyledEmptyState = styled.p`
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
  text-align: center;
  padding: ${({ theme }) => theme.spacing.space6}px;
`;
