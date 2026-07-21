import styled from "styled-components";

/** Avatar, name, balance — shared with `AccountOverviewSkeleton` so the
 *  placeholder rows cannot drift from the real ones. */
export const ROW_COLUMNS = ["38px", "1fr", "auto"];

export const StyledList = styled.ul`
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
`;

export const StyledMain = styled.div`
  min-width: 0;
`;

export const StyledNameLine = styled.div`
  display: flex;
  align-items: center;
  gap: 9px;
`;

export const StyledName = styled.span`
  font-family: ${({ theme }) => theme.typography.scale.bodyMd.fontFamily};
  font-size: ${({ theme }) => theme.typography.scale.bodyMd.fontSize};
  font-weight: 600;
  color: ${({ theme }) => theme.colors.onSurface};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const StyledRight = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 4px;
`;

interface StyledBalanceProps {
  $isLiability: boolean;
}

export const StyledBalance = styled.span<StyledBalanceProps>`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-variant-numeric: tabular-nums;
  color: ${({ theme, $isLiability }) =>
    $isLiability ? theme.colors.error : theme.colors.onSurface};
`;

export const StyledEmptyState = styled.p`
  font-size: ${({ theme }) => theme.typography.sizes.md}px;
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
`;
