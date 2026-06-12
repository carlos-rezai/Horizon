import React from "react";
import { StyledDataRow } from "./DataRow.styles";

interface DataRowProps extends React.HTMLAttributes<HTMLDivElement> {
  columns: string[];
  last?: boolean;
  children: React.ReactNode;
}

export default function DataRow({
  columns,
  last = false,
  onClick,
  children,
  ...rest
}: DataRowProps) {
  const template = columns.map((col) => `minmax(0, ${col})`).join(" ");
  return (
    <StyledDataRow
      data-testid="data-row"
      $columns={template}
      $last={last}
      $clickable={Boolean(onClick)}
      onClick={onClick}
      {...rest}
    >
      {children}
    </StyledDataRow>
  );
}
