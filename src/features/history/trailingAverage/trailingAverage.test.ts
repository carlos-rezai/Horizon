import { describe, it, expect } from "vitest";
import { trailingAverage } from "./trailingAverage";

// The trailing-12-month average behind the History Trends average line
// (Financial History, issue #243). Values are monthly figures in integer
// cents, oldest first; null is an Unknown month.

describe("trailingAverage", () => {
  it("averages the last 12 months of a full window", () => {
    // Two early outliers fall outside the window and must not count.
    const values = [
      9000000, 9000000, 1000, 2000, 3000, 4000, 5000, 6000, 7000, 8000, 9000,
      10000, 11000, 12000,
    ];

    // (1000 + … + 12000) / 12 = 78000 / 12
    expect(trailingAverage(values)).toBe(6500);
  });

  it("averages a partial window of fewer than 12 months", () => {
    expect(trailingAverage([3000, 6000, 9000])).toBe(6000);
  });

  it("averages only the known months, skipping Unknown ones", () => {
    expect(trailingAverage([null, 3000, null, -1000])).toBe(1000);
  });

  it("is null when the window holds no known month", () => {
    expect(trailingAverage([null, null, null])).toBeNull();
    expect(trailingAverage([])).toBeNull();
  });
});
