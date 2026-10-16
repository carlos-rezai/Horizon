import { describe, it, expect } from "vitest";
import type { HistoryPoint } from "../historyTypes/historyTypes";
import { pointsInRange } from "./historyRange";

/** `count` consecutive months ending 2026-10, oldest first. */
function history(count: number): HistoryPoint[] {
  return Array.from({ length: count }, (_, i) => {
    const total = 2026 * 12 + 9 - (count - 1 - i);
    const month = `${Math.floor(total / 12)}-${String((total % 12) + 1).padStart(2, "0")}`;
    return {
      month,
      totalLiquid: 100000,
      restschuld: null,
      netCashflow: 0,
      accounts: {},
    };
  });
}

describe("pointsInRange", () => {
  describe("on a span longer than every range", () => {
    const points = history(60);

    it("keeps the 12 most recent months for 1 Year", () => {
      const shown = pointsInRange(points, "1y");

      expect(shown).toHaveLength(12);
      expect(shown[0].month).toBe("2025-11");
      expect(shown.at(-1)?.month).toBe("2026-10");
    });

    it("keeps the 36 most recent months for 3 Years", () => {
      const shown = pointsInRange(points, "3y");

      expect(shown).toHaveLength(36);
      expect(shown[0].month).toBe("2023-11");
      expect(shown.at(-1)?.month).toBe("2026-10");
    });

    it("keeps every month for All history", () => {
      expect(pointsInRange(points, "all")).toEqual(points);
    });
  });

  describe("on a span shorter than the range", () => {
    const points = history(8);

    it("keeps every month for 1 Year", () => {
      expect(pointsInRange(points, "1y")).toEqual(points);
    });

    it("keeps every month for 3 Years", () => {
      expect(pointsInRange(points, "3y")).toEqual(points);
    });

    it("keeps every month for All history", () => {
      expect(pointsInRange(points, "all")).toEqual(points);
    });
  });
});
