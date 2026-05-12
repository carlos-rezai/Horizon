import styled from "styled-components";

export const StyledSection = styled.section`
  margin-top: ${({ theme }) => theme.spacing.space6}px;
`;

export const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;
  font-variant-numeric: tabular-nums;
  margin-top: ${({ theme }) => theme.spacing.space3}px;
`;

export const StyledTh = styled.th`
  padding: ${({ theme }) => theme.spacing.space2}px
    ${({ theme }) => theme.spacing.space3}px;
  text-align: right;
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
  font-weight: ${({ theme }) => theme.typography.weights.medium};
  border-bottom: 1px solid ${({ theme }) => theme.colors.outlineVariant};

  &:first-child {
    text-align: left;
  }
`;

export const StyledRow = styled.tr`
  cursor: pointer;
  border-bottom: 1px solid ${({ theme }) => theme.colors.outlineVariant};

  &:hover {
    background-color: ${({ theme }) => theme.colors.surfaceContainer};
  }
`;

export const StyledTd = styled.td`
  padding: ${({ theme }) => theme.spacing.space2}px
    ${({ theme }) => theme.spacing.space3}px;
  text-align: right;
  color: ${({ theme }) => theme.colors.onSurface};
  white-space: nowrap;

  &:first-child {
    text-align: left;
    font-weight: ${({ theme }) => theme.typography.weights.semibold};
  }
`;

export const StyledSTAmount = styled.span`
  color: ${({ theme }) => theme.colors.secondary};
`;

export const StyledEmptyState = styled.p`
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;
  margin-top: ${({ theme }) => theme.spacing.space3}px;
`;
