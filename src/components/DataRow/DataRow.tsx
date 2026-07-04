import React from "react";
import { StyledDataRow } from "./DataRow.styles";

interface DataRowOwnProps {
  columns: string[];
  last?: boolean;
  children: React.ReactNode;
}

/**
 * A grid row that renders as a <div> by default but can become any element or
 * component via `as` (e.g. a router <Link> to make the whole row a navigation
 * target). Props for the chosen element — `to`, `href`, `onClick` — are
 * forwarded through.
 */
type DataRowProps<C extends React.ElementType = "div"> = DataRowOwnProps & {
  as?: C;
} & Omit<React.ComponentPropsWithoutRef<C>, keyof DataRowOwnProps | "as">;

export default function DataRow<C extends React.ElementType = "div">({
  columns,
  last = false,
  onClick,
  children,
  ...rest
}: DataRowProps<C>) {
  const template = columns.map((col) => `minmax(0, ${col})`).join(" ");
  // A row is clickable when it has a click handler *or* navigates as a link
  // (`as={Link} to=…` / `as="a" href=…`), so link rows get the pointer cursor
  // and hover affordance too.
  const clickable = Boolean(onClick) || "to" in rest || "href" in rest;
  return (
    <StyledDataRow
      data-testid="data-row"
      $columns={template}
      $last={last}
      $clickable={clickable}
      onClick={onClick}
      {...rest}
    >
      {children}
    </StyledDataRow>
  );
}
