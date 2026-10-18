import styled from "styled-components";
import DataRow from "../../../components/DataRow/DataRow";
import type { TableColumn } from "../../../components/TableColumn/TableColumn";

// icon · file · range · tx count · actions. One definition read by the year
// header and its statement rows, so the year's tx count stacks over each
// statement's.
export const HISTORY_COLUMNS: TableColumn[] = [
  { width: "32px" },
  { width: "1fr" },
  { width: "150px" },
  { width: "90px", align: "end" },
  { width: "140px", align: "end" },
];

export const StyledHead = styled.div`
  padding: 16px 20px 0;
`;

export const StyledHeadRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 4px;
`;

export const StyledHeadTitle = styled.div`
  font-family: ${({ theme }) => theme.typography.scale.h2.fontFamily};
  font-size: ${({ theme }) => theme.typography.scale.h2.fontSize};
  font-weight: ${({ theme }) => theme.typography.scale.h2.fontWeight};
  color: ${({ theme }) => theme.colors.onSurface};
`;

export const StyledHeadMeta = styled.span`
  font-family: ${({ theme }) => theme.typography.scale.body.fontFamily};
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.onSurfaceDim};
`;

export const StyledYearGroup = styled.div`
  border-bottom: 1px solid ${({ theme }) => theme.colors.outlineVariant};
`;

/* A DataRow rendered as the year's toggle button: the button resets only. */
export const StyledYearHeader = styled(DataRow)<{ $open: boolean }>`
  width: 100%;
  border: none;
  font: inherit;
  color: inherit;
  text-align: left;
  background: ${({ theme, $open }) =>
    $open ? theme.colors.surfaceContainerLow : "transparent"};
`;

export const StyledChevron = styled.span<{ $open: boolean }>`
  display: grid;
  place-items: center;
  color: ${({ theme, $open }) =>
    $open ? theme.colors.primary : theme.colors.onSurfaceDim};
  transform: ${({ $open }) => ($open ? "rotate(90deg)" : "none")};
  transition: transform 0.18s ease;
`;

export const StyledYear = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: 16px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.onSurface};
`;

export const StyledYearCount = styled.span`
  font-family: ${({ theme }) => theme.typography.scale.body.fontFamily};
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.onSurfaceDim};
`;

export const StyledYearTotal = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
`;

export const StyledYearBody = styled.div`
  padding: 4px 0 14px;
`;

export const StyledFileRow = styled(DataRow)``;

export const StyledFileIcon = styled.div<{ $color: string }>`
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border-radius: ${({ theme }) => theme.radius.md}px;
  background: ${({ $color }) => $color + "1a"};
  color: ${({ $color }) => $color};
`;

export const StyledFileMain = styled.div`
  min-width: 0;
`;

export const StyledFileName = styled.div`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: 13px;
  font-weight: 500;
  color: ${({ theme }) => theme.colors.onSurface};
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
`;

export const StyledFileSub = styled.div`
  display: flex;
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space2}px;
  margin-top: 4px;
`;

export const StyledFileMeta = styled.span`
  font-family: ${({ theme }) => theme.typography.scale.body.fontFamily};
  font-size: 12px;
  color: ${({ theme }) => theme.colors.onSurfaceDim};
`;

export const StyledFileRange = styled.span`
  font-family: ${({ theme }) => theme.typography.scale.body.fontFamily};
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
`;

export const StyledFileCount = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: 13px;
  color: ${({ theme }) => theme.colors.onSurface};

  small {
    color: ${({ theme }) => theme.colors.onSurfaceFaint};
    font-size: 11px;
  }
`;

export const StyledActions = styled.div`
  display: flex;
  gap: 2px;
  justify-content: flex-end;
  opacity: 0.45;

  ${StyledFileRow}:hover & {
    opacity: 1;
  }
`;
