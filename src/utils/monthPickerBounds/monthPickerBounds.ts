// Pure derivation for the Month Overview MonthYearPicker.
//
// The picker may browse from the month of the earliest imported transaction up
// to the current month. These helpers turn the raw imports list plus the
// current month into a `[min, max]` range and, per view year, a 12-cell grid of
// which months are selectable. Months are 1-based (January = 1, December = 12).

export interface MonthPickerBounds {
  minYear: number;
  minMonth: number;
  maxYear: number;
  maxMonth: number;
}

/**
 * Derive the browsable range from the imports' start dates and the current
 * month. The lower bound is the month of the earliest import; the upper bound
 * is always the current month. With no imports the range collapses to the
 * current month, degrading the picker to a single selectable cell.
 *
 * @param importStartDates ISO date strings ("YYYY-MM-DD" or "YYYY-MM").
 * @param currentMonth "YYYY-MM".
 */
export function deriveMonthPickerBounds(
  importStartDates: string[],
  currentMonth: string
): MonthPickerBounds {
  const [maxYear, maxMonth] = currentMonth.split("-").map(Number);

  let minYear = maxYear;
  let minMonth = maxMonth;

  for (const startDate of importStartDates) {
    const [year, month] = startDate.split("-").map(Number);
    if (year < minYear || (year === minYear && month < minMonth)) {
      minYear = year;
      minMonth = month;
    }
  }

  return { minYear, minMonth, maxYear, maxMonth };
}

/**
 * Build the 12-cell enabled/disabled grid for a given view year. Index 0 is
 * January, index 11 is December. A cell is enabled only when its month falls
 * inside the `[min, max]` range.
 */
export function buildMonthGrid(
  bounds: MonthPickerBounds,
  viewYear: number
): boolean[] {
  return Array.from({ length: 12 }, (_, index) => {
    const month = index + 1;
    if (viewYear < bounds.minYear || viewYear > bounds.maxYear) return false;
    if (viewYear === bounds.minYear && month < bounds.minMonth) return false;
    if (viewYear === bounds.maxYear && month > bounds.maxMonth) return false;
    return true;
  });
}
