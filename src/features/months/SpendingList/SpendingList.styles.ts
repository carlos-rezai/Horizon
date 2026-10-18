import styled from "styled-components";
import type { TableColumn } from "../../../components/TableColumn/TableColumn";

// day · description · category · amount. Lives here so the list and its
// skeleton share one definition.
export const ROW_COLUMNS: TableColumn[] = [
  { width: "44px" },
  { width: "1fr" },
  { width: "auto" },
  { width: "auto", align: "end" },
];

export const StyledTabsWrap = styled.div`
  margin-bottom: ${({ theme }) => theme.spacing.space3}px;
`;

export const StyledDesc = styled.div`
  font-family: ${({ theme }) => theme.typography.scale.body.fontFamily};
  font-size: ${({ theme }) => theme.typography.scale.body.fontSize};
  font-weight: 500;
  color: ${({ theme }) => theme.colors.onSurface};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const StyledAccountLine = styled.div`
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 3px;
`;

export const StyledAccountName = styled.span`
  font-family: ${({ theme }) => theme.typography.scale.body.fontFamily};
  font-size: 12px;
  color: ${({ theme }) => theme.colors.onSurfaceDim};
`;

export const StyledEmpty = styled.div`
  font-family: ${({ theme }) => theme.typography.scale.body.fontFamily};
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.onSurfaceDim};
  padding: ${({ theme }) => theme.spacing.space4}px 0;
`;
