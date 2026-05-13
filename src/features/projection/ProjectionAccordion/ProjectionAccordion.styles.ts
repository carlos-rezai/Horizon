import styled from "styled-components";

export const StyledAccordion = styled.div`
  display: flex;
  flex-direction: column;
`;

export const StyledYearSection = styled.div``;

export const StyledYearHeader = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space4}px;
  padding: ${({ theme }) => theme.spacing.space2}px
    ${({ theme }) => theme.spacing.space3}px;
  background: transparent;
  border: none;
  border-bottom: 1px solid ${({ theme }) => theme.colors.outlineVariant};
  cursor: pointer;
  text-align: left;

  &:hover {
    background-color: ${({ theme }) => theme.colors.surfaceContainerHigh};
  }
`;

export const StyledYearLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.sizes.md}px;
  font-weight: ${({ theme }) => theme.typography.weights.semibold};
  color: ${({ theme }) => theme.colors.onSurface};
  min-width: 48px;
`;

export const StyledYearMeta = styled.span`
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
  font-variant-numeric: tabular-nums;
`;

export const StyledLiquidMeta = styled(StyledYearMeta)`
  color: ${({ theme }) => theme.colors.secondary};
`;

export const StyledRestschuldMeta = styled(StyledYearMeta)`
  color: ${({ theme }) => theme.colors.error};
`;

export const StyledRowSpacer = styled.span`
  flex: 1;
`;

export const StyledChevron = styled.span<{ $expanded: boolean }>`
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
  display: flex;
  align-items: center;
  transform: ${({ $expanded }) =>
    $expanded ? "rotate(180deg)" : "rotate(0deg)"};
  transition: transform 150ms ease;
`;

export const StyledTableWrapper = styled.div`
  overflow-x: auto;
  background-color: ${({ theme }) => theme.colors.surface};
`;

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
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
  font-weight: ${({ theme }) => theme.typography.weights.medium};
  border-bottom: 1px solid ${({ theme }) => theme.colors.outlineVariant};
  white-space: nowrap;

  &:first-child {
    text-align: left;
  }
`;

export const StyledTr = styled.tr<{
  $isSTMonth?: boolean;
  $isPayoffMonth?: boolean;
}>`
  &:not(:last-child) {
    border-bottom: 1px solid ${({ theme }) => theme.colors.outlineVariant};
  }

  background-color: ${({ theme, $isSTMonth, $isPayoffMonth }) => {
    if ($isPayoffMonth) return theme.colors.tertiaryTint;
    if ($isSTMonth) return theme.colors.secondaryTint;
    return "transparent";
  }};

  &:hover {
    background-color: ${({ theme, $isSTMonth, $isPayoffMonth }) => {
      if ($isPayoffMonth) return theme.colors.tertiaryTint;
      if ($isSTMonth) return theme.colors.secondaryTint;
      return theme.colors.surfaceContainer;
    }};
  }
`;

export const StyledPayoffBadge = styled.span`
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;
  color: ${({ theme }) => theme.colors.tertiary};
  font-variant-numeric: tabular-nums;
`;

export const StyledSTBadge = styled.span`
  color: ${({ theme }) => theme.colors.secondary};
  font-size: ${({ theme }) => theme.typography.sizes.xs}px;
  margin-left: ${({ theme }) => theme.spacing.space2}px;
`;

export const StyledTd = styled.td<{ $isActual?: boolean }>`
  padding: ${({ theme }) => theme.spacing.space2}px
    ${({ theme }) => theme.spacing.space3}px;
  text-align: right;
  color: ${({ theme, $isActual }) =>
    $isActual ? theme.colors.onSurfaceVariant : theme.colors.onSurface};
  white-space: nowrap;

  &:first-child {
    text-align: left;
    color: ${({ theme }) => theme.colors.onSurfaceVariant};
  }
`;

export const StyledEmptyState = styled.div`
  padding: ${({ theme }) => theme.spacing.space8}px;
  text-align: center;
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;
`;
