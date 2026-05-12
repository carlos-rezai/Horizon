import styled from "styled-components";

export const StyledList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.space3}px;
`;

export const StyledAccountLink = styled.a`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space3}px;
  padding: ${({ theme }) => theme.spacing.space4}px;
  background-color: ${({ theme }) => theme.colors.surfaceContainer};
  border: 1px solid ${({ theme }) => theme.colors.outlineVariant};
  border-radius: 8px;
  text-decoration: none;
  color: inherit;

  &:hover {
    background-color: ${({ theme }) => theme.colors.surfaceContainerHigh};
    border-color: ${({ theme }) => theme.colors.primary};
  }
`;

export const StyledAccountName = styled.span`
  flex: 1;
  font-size: ${({ theme }) => theme.typography.sizes.md}px;
  font-weight: ${({ theme }) => theme.typography.weights.medium};
  color: ${({ theme }) => theme.colors.onSurface};
`;

interface StyledBalanceProps {
  $isLiability: boolean;
}

export const StyledBalance = styled.span<StyledBalanceProps>`
  font-size: ${({ theme }) => theme.typography.sizes.md}px;
  font-weight: ${({ theme }) => theme.typography.weights.medium};
  font-variant-numeric: tabular-nums;
  color: ${({ theme, $isLiability }) =>
    $isLiability ? theme.colors.error : theme.colors.secondary};
`;

export const StyledEmptyState = styled.p`
  font-size: ${({ theme }) => theme.typography.sizes.md}px;
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
`;
