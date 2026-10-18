import { css } from "styled-components";

/**
 * One column of a table: its track width, its optional heading, and its
 * horizontal alignment. `TableHeader` and `DataRow` both read the same
 * `TableColumn[]`, so a heading and the cells under it cannot disagree.
 */
export interface TableColumn {
  label?: string;
  width: string;
  align?: "start" | "end";
}

/** Inline padding shared by `TableHeader` and `DataRow`, so their grids line up. */
export const TABLE_INLINE_PADDING = 14;

/** The grid template both rows use: every track clamped with `minmax(0, …)`. */
export function gridTemplate(columns: TableColumn[]): string {
  return columns.map((col) => `minmax(0, ${col.width})`).join(" ");
}

/** End-aligns the cells of every end-aligned column. */
export const columnAlignment = css<{ $columns: TableColumn[] }>`
  ${({ $columns }) =>
    $columns.map((col, i) =>
      col.align === "end"
        ? css`
            & > :nth-child(${i + 1}) {
              justify-self: end;
              text-align: right;
            }
          `
        : ""
    )}
`;
