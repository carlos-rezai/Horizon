import styled from "styled-components";

export const StyledList = styled.ul`
  list-style: none;
  padding: 0;
  margin: 0;
`;

export const StyledRow = styled.li`
  display: grid;
  grid-template-columns: 110px 1fr 120px auto;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space4}px;
  padding: ${({ theme }) => theme.spacing.space2}px
    ${({ theme }) => theme.spacing.space4}px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  cursor: pointer;

  &:hover {
    background: ${({ theme }) => theme.colors.bgElevated};
  }
`;

export const StyledDate = styled.span`
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;
`;

export const StyledAmount = styled.span`
  text-align: right;
  font-variant-numeric: tabular-nums;
  color: ${({ theme }) => theme.colors.textPrimary};
`;

export const StyledDescription = styled.span`
  color: ${({ theme }) => theme.colors.textPrimary};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const StyledTransferBadge = styled.span`
  font-size: ${({ theme }) => theme.typography.sizes.xs}px;
  color: ${({ theme }) => theme.colors.accent};
  background: ${({ theme }) => theme.colors.bgElevated};
  border: 1px solid ${({ theme }) => theme.colors.accent};
  border-radius: 4px;
  padding: 2px 6px;
`;

export const StyledEmptyState = styled.p`
  color: ${({ theme }) => theme.colors.textMuted};
  text-align: center;
  padding: ${({ theme }) => theme.spacing.space6}px;
`;
