/**
 * Test support for the alignment owner (issue #274). jsdom has no layout, so
 * "a heading and its figures sit in one column" is read from the computed
 * styles that decide it: the grid the cell sits in (its column template and
 * horizontal padding), the cell's index in that grid, and the cell's
 * horizontal alignment. Two elements that report the same position cannot
 * land at different x.
 */
export interface ColumnPosition {
  template: string;
  paddingLeft: string;
  paddingRight: string;
  index: number;
  align: "start" | "end";
}

function isGrid(el: Element): boolean {
  const display = getComputedStyle(el).display;
  return display === "grid" || display === "inline-grid";
}

/**
 * The horizontal alignment of `el` inside its grid cell: `end` when the cell
 * is justified to the end, or when the nearest element between `el` and the
 * cell that sets `text-align` sets it to right/end.
 */
function alignmentOf(el: Element, cell: Element): "start" | "end" {
  if (getComputedStyle(cell).justifySelf === "end") return "end";
  let node: Element | null = el;
  while (node) {
    const textAlign = getComputedStyle(node).textAlign;
    if (textAlign) {
      return textAlign === "right" || textAlign === "end" ? "end" : "start";
    }
    if (node === cell) break;
    node = node.parentElement;
  }
  return "start";
}

/** Where `el` sits: the nearest grid that holds it, and which column. */
export function columnOf(el: Element): ColumnPosition | null {
  let cell: Element = el;
  let grid: Element | null = el.parentElement;
  while (grid && !isGrid(grid)) {
    cell = grid;
    grid = grid.parentElement;
  }
  if (!grid) return null;
  const style = getComputedStyle(grid);
  return {
    template: style.gridTemplateColumns,
    paddingLeft: style.paddingLeft,
    paddingRight: style.paddingRight,
    index: Array.from(grid.children).indexOf(cell),
    align: alignmentOf(el, cell),
  };
}

/**
 * The deepest element whose whole text is `text`, so a figure split across
 * child nodes ("3" + "<small> tx</small>") is still found as one.
 */
export function deepestWithText(root: Element, text: string, nth = 0): Element {
  const normal = (s: string | null) => (s ?? "").replace(/\s+/g, " ").trim();
  const want = normal(text);
  const matches = Array.from(root.querySelectorAll("*")).filter(
    (el) =>
      normal(el.textContent) === want &&
      !Array.from(el.children).some(
        (child) => normal(child.textContent) === want
      )
  );
  const match = matches[nth];
  if (!match) throw new Error(`No element #${nth} with text "${text}"`);
  return match;
}
