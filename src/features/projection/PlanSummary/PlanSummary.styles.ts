import styled from "styled-components";

export const StyledSection = styled.section``;

export const StyledTable = styled.table`
  width: 100%;
  border-collapse: collapse;
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;
  font-variant-numeric: tabular-nums;
`;

export const StyledTh = styled.th`
  padding: ${({ theme }) => theme.spacing.space2}px
    ${({ theme }) => theme.spacing.space3}px;
  text-align: right;
  font-family: ${({ theme }) => theme.typography.scale.label.fontFamily};
  font-size: ${({ theme }) => theme.typography.scale.label.fontSize};
  font-weight: ${({ theme }) => theme.typography.scale.label.fontWeight};
  letter-spacing: ${({ theme }) => theme.typography.scale.label.letterSpacing};
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.onSurfaceFaint};

  &:first-child {
    text-align: left;
  }
`;

export const StyledRow = styled.tr`
  cursor: pointer;

  &:hover {
    background-color: ${({ theme }) => theme.colors.surfaceContainerHigh};
  }
`;

export const StyledPayoffRow = styled(StyledRow)`
  background-color: ${({ theme }) => theme.colors.primaryContainer};

  &:hover {
    background-color: ${({ theme }) => theme.colors.primaryContainer};
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
  }
`;

export const StyledYear = styled.span<{ $payoff: boolean }>`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-weight: ${({ theme }) => theme.typography.weights.semibold};
  color: ${({ $payoff, theme }) =>
    $payoff ? theme.colors.primary : theme.colors.onSurface};
`;

export const StyledTotalLiquidAmount = styled.span`
  color: ${({ theme }) => theme.colors.secondary};
`;

export const StyledRestschuldAmount = styled.span`
  color: ${({ theme }) => theme.colors.error};
`;

export const StyledPayoffFlag = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-family: ${({ theme }) => theme.typography.scale.label.fontFamily};
  font-size: 10px;
  font-weight: ${({ theme }) => theme.typography.scale.label.fontWeight};
  letter-spacing: ${({ theme }) => theme.typography.scale.label.letterSpacing};
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.primary};
`;

export const StyledSTAmount = styled.span`
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
`;

export const StyledDash = styled.span`
  color: ${({ theme }) => theme.colors.onSurfaceFaint};
`;

export const StyledEmptyState = styled.p`
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;
  margin-top: ${({ theme }) => theme.spacing.space3}px;
`;
