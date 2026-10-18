import styled from "styled-components";
import {
  columnAlignment,
  gridTemplate,
  TABLE_INLINE_PADDING,
  type TableColumn,
} from "../TableColumn/TableColumn";

export const StyledHeaderRow = styled.div<{ $columns: TableColumn[] }>`
  display: grid;
  grid-template-columns: ${({ $columns }) => gridTemplate($columns)};
  align-items: center;
  gap: ${({ theme }) => theme.spacing.space4}px;
  padding: ${({ theme }) => theme.spacing.space2}px ${TABLE_INLINE_PADDING}px;
  border-bottom: 1px solid ${({ theme }) => theme.colors.outline};

  ${columnAlignment}
`;

export const StyledHeaderCell = styled.span`
  color: ${({ theme }) => theme.colors.onSurfaceVariant};
  font-size: ${({ theme }) => theme.typography.sizes.xs}px;
  font-weight: ${({ theme }) => theme.typography.weights.semibold};
  text-transform: uppercase;
  letter-spacing: 0.05em;
`;
