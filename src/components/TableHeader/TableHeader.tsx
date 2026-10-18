import { StyledHeaderRow, StyledHeaderCell } from "./TableHeader.styles";
import type { TableColumn } from "../TableColumn/TableColumn";

interface Props {
  columns: TableColumn[];
}

export default function TableHeader({ columns }: Props) {
  return (
    <StyledHeaderRow $columns={columns}>
      {columns.map((col, i) => (
        <StyledHeaderCell key={col.label ?? i}>{col.label}</StyledHeaderCell>
      ))}
    </StyledHeaderRow>
  );
}
