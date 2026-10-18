import styled from "styled-components";
import {
  columnAlignment,
  gridTemplate,
  TABLE_INLINE_PADDING,
  type TableColumn,
} from "../TableColumn/TableColumn";

interface StyledDataRowProps {
  $columns: TableColumn[];
  $last: boolean;
  $clickable: boolean;
}

export const StyledDataRow = styled.div<StyledDataRowProps>`
  display: grid;
  grid-template-columns: ${({ $columns }) => gridTemplate($columns)};
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space4}px;
  padding: 13px ${TABLE_INLINE_PADDING}px;
  border-radius: ${({ theme }) => theme.radius.md}px;
  border-bottom: ${({ $last, theme }) =>
    $last ? "none" : `1px solid ${theme.colors.lineFaint}`};
  cursor: ${({ $clickable }) => ($clickable ? "pointer" : "default")};
  transition: background 0.12s ease;

  ${columnAlignment}

  &:hover {
    background: ${({ $clickable, theme }) =>
      $clickable ? theme.colors.surfaceContainerHigh : "transparent"};
  }
`;
