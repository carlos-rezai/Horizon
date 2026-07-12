import { describe, it, expect } from "vitest";
import { deriveMonthPickerBounds, buildMonthGrid } from "./monthPickerBounds";

// ---------------------------------------------------------------------------
// deriveMonthPickerBounds
//
// The lower bound is the month of the earliest imported transaction; the upper
// bound is always the current month. With no imports, the range collapses to
// the current month so the picker degrades to a single selectable cell.
// ---------------------------------------------------------------------------

describe("deriveMonthPickerBounds", () => {
  it("spans from the earliest import month to the current month", () => {
    const bounds = deriveMonthPickerBounds(
      ["2023-08-14", "2021-11-02", "2022-04-30"],
      "2024-06"
    );

    expect(bounds).toEqual({
      minYear: 2021,
      minMonth: 11,
      maxYear: 2024,
      maxMonth: 6,
    });
  });

  it("ignores import ordering when finding the earliest month", () => {
    const bounds = deriveMonthPickerBounds(
      ["2023-01-05", "2020-12-31", "2023-07-19"],
      "2023-09"
    );

    expect(bounds.minYear).toBe(2020);
    expect(bounds.minMonth).toBe(12);
  });

  it("collapses to the current month when there are no imports", () => {
    const bounds = deriveMonthPickerBounds([], "2026-07");

    expect(bounds).toEqual({
      minYear: 2026,
      minMonth: 7,
      maxYear: 2026,
      maxMonth: 7,
    });
  });
});

// ---------------------------------------------------------------------------
// buildMonthGrid
//
// A 12-element boolean grid for a given view year, index 0 = January. A cell is
// enabled only when its month falls inside [min, max].
// ---------------------------------------------------------------------------

describe("buildMonthGrid", () => {
  const bounds = deriveMonthPickerBounds(
    ["2022-03-15"], // earliest import: March 2022
    "2024-09" // current month: September 2024
  );

  it("returns twelve cells", () => {
    expect(buildMonthGrid(bounds, 2023)).toHaveLength(12);
  });

  it("disables months before the earliest import in the earliest year", () => {
    const grid = buildMonthGrid(bounds, 2022);

    // Jan (0), Feb (1) precede March -> disabled; March onward enabled.
    expect(grid[0]).toBe(false);
    expect(grid[1]).toBe(false);
    expect(grid[2]).toBe(true); // March
    expect(grid[11]).toBe(true); // December
  });

  it("disables months after the current month in the latest year", () => {
    const grid = buildMonthGrid(bounds, 2024);

    expect(grid[8]).toBe(true); // September (current)
    expect(grid[9]).toBe(false); // October -> future
    expect(grid[11]).toBe(false); // December -> future
  });

  it("enables every month of a year fully inside the range", () => {
    expect(buildMonthGrid(bounds, 2023).every(Boolean)).toBe(true);
  });

  it("disables every month of a year outside the range", () => {
    expect(buildMonthGrid(bounds, 2021).some(Boolean)).toBe(false);
    expect(buildMonthGrid(bounds, 2025).some(Boolean)).toBe(false);
  });

  it("enables only the current month when there are no imports", () => {
    const collapsed = deriveMonthPickerBounds([], "2026-07");
    const grid = buildMonthGrid(collapsed, 2026);

    expect(grid.filter(Boolean)).toHaveLength(1);
    expect(grid[6]).toBe(true); // July only
  });
});
