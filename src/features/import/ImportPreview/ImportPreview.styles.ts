import styled from "styled-components";

export const StyledPreview = styled.div`
  width: min(636px, 86vw);
`;

export const StyledMeta = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space3}px;
  flex-wrap: wrap;
  margin-bottom: 16px;
`;

export const StyledFileName = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: 13px;
  color: ${({ theme }) => theme.colors.onSurface};
`;

export const StyledAccountBadge = styled.span<{ $color: string }>`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 9px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  font-family: ${({ theme }) => theme.typography.scale.body.fontFamily};
  font-size: 11px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.onSurface};
  background: ${({ $color }) => $color + "1f"};

  &::before {
    content: "";
    width: 7px;
    height: 7px;
    border-radius: 999px;
    background: ${({ $color }) => $color};
  }
`;

export const StyledCount = styled.span`
  font-family: ${({ theme }) => theme.typography.scale.body.fontFamily};
  font-size: 12px;
  color: ${({ theme }) => theme.colors.onSurfaceDim};
`;

export const StyledTable = styled.div`
  border: 1px solid ${({ theme }) => theme.colors.outlineVariant};
  border-radius: ${({ theme }) => theme.radius.md}px;
  overflow: hidden;
`;

export const StyledRow = styled.div<{ $alt: boolean }>`
  display: grid;
  grid-template-columns: 90px minmax(0, 1fr) 120px 100px;
  gap: 12px;
  align-items: center;
  padding: 10px 14px;
  background: ${({ theme, $alt }) =>
    $alt ? theme.colors.surfaceContainerLow : "transparent"};

  &:not(:last-child) {
    border-bottom: 1px solid ${({ theme }) => theme.colors.lineFaint};
  }
`;

export const StyledDate = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: 11.5px;
  color: ${({ theme }) => theme.colors.onSurfaceDim};
`;

export const StyledDesc = styled.span`
  font-family: ${({ theme }) => theme.typography.scale.body.fontFamily};
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.onSurface};
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
`;

export const StyledCategory = styled.span`
  font-family: ${({ theme }) => theme.typography.scale.body.fontFamily};
  font-size: 12px;
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
`;

export const StyledAmount = styled.span`
  text-align: right;
`;
