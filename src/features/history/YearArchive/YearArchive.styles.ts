import styled from "styled-components";
import { Link } from "react-router-dom";
import DataRow from "../../../components/DataRow/DataRow";
import {
  TABLE_INLINE_PADDING,
  type TableColumn,
} from "../../../components/TableColumn/TableColumn";

// chevron · period · total liquid · restschuld · net cashflow · statements.
// One definition read by the column header, the year rows and the month rows,
// so every figure sits under its heading.
export const ARCHIVE_COLUMNS: TableColumn[] = [
  { width: "22px" },
  { label: "Period", width: "72px" },
  { label: "Total Liquid", width: "1fr", align: "end" },
  { label: "Restschuld", width: "1fr", align: "end" },
  { label: "Net Cashflow", width: "1fr", align: "end" },
  { label: "Statements", width: "120px", align: "end" },
];

export const StyledArchive = styled.section`
  margin-top: ${({ theme }) => theme.spacing.space5}px;
  background-color: ${({ theme }) => theme.colors.surfaceContainer};
  border: 1px solid ${({ theme }) => theme.colors.outlineVariant};
  border-radius: ${({ theme }) => theme.radius.card}px;
  overflow: hidden;
`;

export const StyledSectionHead = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px ${({ theme }) => theme.spacing.space5}px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.outlineVariant};
`;

export const StyledSectionTitle = styled.div`
  font-family: ${({ theme }) => theme.typography.scale.h2.fontFamily};
  font-size: ${({ theme }) => theme.typography.scale.h2.fontSize};
  font-weight: ${({ theme }) => theme.typography.scale.h2.fontWeight};
  letter-spacing: ${({ theme }) => theme.typography.scale.h2.letterSpacing};
  color: ${({ theme }) => theme.colors.onSurface};
`;

export const StyledYearSection = styled.div`
  border-bottom: 1px solid ${({ theme }) => theme.colors.outlineVariant};

  &:last-child {
    border-bottom: none;
  }
`;

/* The year row stacks its toggle and its statements badge in one grid cell:
   the toggle is the full-width DataRow, the badge sits over its last column. */
export const StyledYearRow = styled.div<{ $open: boolean }>`
  display: grid;
  align-items: center;
  background: ${({ theme, $open }) =>
    $open ? theme.colors.surfaceContainerLow : "transparent"};

  & > * {
    grid-area: 1 / 1;
  }
`;

/* A DataRow rendered as the year's toggle button: the button resets only. */
export const StyledYearHeader = styled(DataRow)`
  width: 100%;
  border: none;
  font: inherit;
  color: inherit;
  text-align: left;

  /* Total Liquid · Restschuld are rendered as bare Money spans so each cell's
     textContent stays unique; their tone lives on the grid cells. */
  & > :nth-child(3) {
    color: ${({ theme }) => theme.colors.secondary};
  }

  & > :nth-child(4) {
    color: ${({ theme }) => theme.colors.error};
  }
`;

export const StyledChevron = styled.span<{ $open: boolean }>`
  display: grid;
  place-items: center;
  color: ${({ theme, $open }) =>
    $open ? theme.colors.primary : theme.colors.onSurfaceDim};
  transform: ${({ $open }) => ($open ? "rotate(90deg)" : "none")};
  transition: transform ${({ theme }) => theme.transitions.swap};
`;

export const StyledYearLabel = styled.span`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: 15px;
  font-weight: 600;
  color: ${({ theme }) => theme.colors.onSurface};
`;

export const StyledCountBadge = styled(Link)`
  justify-self: end;
  margin-right: ${TABLE_INLINE_PADDING}px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: ${({ theme }) => theme.spacing.space1}px
    ${({ theme }) => theme.spacing.space3}px;
  border-radius: ${({ theme }) => theme.radius.pill}px;
  background: ${({ theme }) => theme.colors.surfaceContainerHigh};
  border: 1px solid ${({ theme }) => theme.colors.outlineVariant};
  color: ${({ theme }) => theme.colors.primary};
  font-family: ${({ theme }) => theme.typography.scale.body.fontFamily};
  font-size: ${({ theme }) => theme.typography.sizes.sm}px;
  font-weight: 600;
  text-decoration: none;
  white-space: nowrap;

  &:hover {
    background: ${({ theme }) => theme.colors.surfaceContainerHighest};
  }
`;

export const StyledMonthName = styled.span`
  display: inline-flex;
  align-items: center;
  gap: 6px;
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-size: 12.5px;
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
`;

type NumTone = "pos" | "debt" | "text";

export const StyledNum = styled.span<{ $tone?: NumTone }>`
  font-family: ${({ theme }) => theme.typography.fontFamily.mono};
  font-variant-numeric: tabular-nums;
  color: ${({ theme, $tone }) =>
    $tone === "pos"
      ? theme.colors.secondary
      : $tone === "debt"
        ? theme.colors.error
        : theme.colors.onSurface};
`;
