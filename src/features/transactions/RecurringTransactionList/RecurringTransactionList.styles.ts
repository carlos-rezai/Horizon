import styled from "styled-components";

export const StyledList = styled.div`
  display: flex;
  flex-direction: column;
`;

export const StyledHeaderRow = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 150px 120px 110px;
  gap: 16px;
  padding: 0 14px 10px;
`;

export const StyledHeaderCell = styled.span<{ $right?: boolean }>`
  font-family: ${({ theme }) => theme.typography.scale.label.fontFamily};
  font-size: ${({ theme }) => theme.typography.scale.label.fontSize};
  font-weight: ${({ theme }) => theme.typography.scale.label.fontWeight};
  letter-spacing: ${({ theme }) => theme.typography.scale.label.letterSpacing};
  text-transform: uppercase;
  color: ${({ theme }) => theme.colors.onSurfaceDim};
  text-align: ${({ $right }) => ($right ? "right" : "left")};
`;

export const StyledName = styled.div`
  font-family: ${({ theme }) => theme.typography.scale.body.fontFamily};
  font-weight: 500;
  color: ${({ theme }) => theme.colors.onSurface};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const StyledLinkedLine = styled.div`
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
  color: ${({ theme }) => theme.colors.onSurfaceDim};
`;

export const StyledLinkedName = styled.span`
  font-family: ${({ theme }) => theme.typography.scale.body.fontFamily};
  font-size: 12px;
  color: ${({ theme }) => theme.colors.onSurfaceDim};
`;

export const StyledRight = styled.div`
  justify-self: end;
  text-align: right;
`;

export const StyledDay = styled.div`
  justify-self: end;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.onSurfaceDim};
`;

export const StyledEmptyState = styled.div`
  padding: 24px 14px;
  color: ${({ theme }) => theme.colors.onSurfaceDim};
  font-size: 14px;
`;
