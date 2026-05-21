import { StyledHeaderRow, StyledHeaderCell } from "./TableHeader.styles";

interface Props {
  columns: string[];
  gridTemplate: string;
}

export default function TableHeader({ columns, gridTemplate }: Props) {
  return (
    <StyledHeaderRow $gridTemplate={gridTemplate}>
      {columns.map((col) => (
        <StyledHeaderCell key={col}>{col}</StyledHeaderCell>
      ))}
    </StyledHeaderRow>
  );
}
