import styled from "styled-components";

export const StyledAccordion = styled.div`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spacing.space2}px;
`;

export const StyledYearSection = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.border};
  border-radius: 8px;
  overflow: hidden;
`;

export const StyledYearHeader = styled.button`
  width: 100%;
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space4}px;
  padding: ${({ theme }) => theme.spacing.space3}px
    ${({ theme }) => theme.spacing.space4}px;
  background-color: ${({ theme }) => theme.colors.bgSurface};
  border: none;
  cursor: pointer;
  text-align: left;

  &:hover {
    background-color: ${({ theme }) => theme.colors.bgElevated};
  }
`;

export const StyledYearLabel = styled.span`
  font-size: ${({ theme }) => theme.typography.sizes.md}px;
  font-weight: ${({ theme }) => theme.typography.weights.semibold};
  color: ${({ theme }) => theme.colors.textPrimary};
  min-width: 48px;
`;

export const StyledYearMeta = styled.span`
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;
  color: ${({ theme }) => theme.colors.textMuted};
  font-variant-numeric: tabular-nums;
`;

export const StyledChevron = styled.span<{ $expanded: boolean }>`
  margin-left: auto;
  color: ${({ theme }) => theme.colors.textMuted};
  display: flex;
  align-items: center;
  transform: ${({ $expanded }) =>
    $expanded ? "rotate(180deg)" : "rotate(0deg)"};
  transition: transform 150ms ease;
`;

export const StyledTableWrapper = styled.div`
  overflow-x: auto;
  background-color: ${({ theme }) => theme.colors.bgBase};
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
  color: ${({ theme }) => theme.colors.textMuted};
  font-weight: ${({ theme }) => theme.typography.weights.medium};
  border-bottom: 1px solid ${({ theme }) => theme.colors.border};
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
    border-bottom: 1px solid ${({ theme }) => theme.colors.border};
  }

  background-color: ${({ theme, $isSTMonth, $isPayoffMonth }) => {
    if ($isPayoffMonth) return theme.colors.warningTint;
    if ($isSTMonth) return theme.colors.positiveTint;
    return "transparent";
  }};

  &:hover {
    background-color: ${({ theme, $isSTMonth, $isPayoffMonth }) => {
      if ($isPayoffMonth) return theme.colors.warningTint;
      if ($isSTMonth) return theme.colors.positiveTint;
      return theme.colors.bgSurface;
    }};
  }
`;

export const StyledPayoffBadge = styled.span`
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;
  color: ${({ theme }) => theme.colors.warning};
  font-variant-numeric: tabular-nums;
`;

export const StyledSTBadge = styled.span`
  color: ${({ theme }) => theme.colors.positive};
  font-size: ${({ theme }) => theme.typography.sizes.xs}px;
  margin-left: ${({ theme }) => theme.spacing.space2}px;
`;

export const StyledTd = styled.td<{ $isActual?: boolean }>`
  padding: ${({ theme }) => theme.spacing.space2}px
    ${({ theme }) => theme.spacing.space3}px;
  text-align: right;
  color: ${({ theme, $isActual }) =>
    $isActual ? theme.colors.textMuted : theme.colors.textPrimary};
  white-space: nowrap;

  &:first-child {
    text-align: left;
    color: ${({ theme }) => theme.colors.textMuted};
  }
`;

export const StyledEmptyState = styled.div`
  padding: ${({ theme }) => theme.spacing.space8}px;
  text-align: center;
  color: ${({ theme }) => theme.colors.textMuted};
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;
`;
