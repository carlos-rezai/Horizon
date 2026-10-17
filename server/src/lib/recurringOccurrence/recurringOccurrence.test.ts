import { describe, expect, it } from "vitest";
import {
  firesInMonth,
  occurrenceDate,
  passesAnchorGate,
} from "./recurringOccurrence.js";
import type { Frequency } from "../../storage/types.js";

// Every YYYY-MM month from `from` through `to`, inclusive.
function monthRange(from: string, to: string): string[] {
  const months: string[] = [];
  let [year, month] = from.split("-").map((part) => parseInt(part, 10));
  for (;;) {
    const ym = `${year}-${String(month).padStart(2, "0")}`;
    months.push(ym);
    if (ym === to) return months;
    month += 1;
    if (month > 12) {
      month = 1;
      year += 1;
    }
  }
}

function firingMonths(
  rule: { frequency: Frequency; monthOfYear?: number },
  sourceAnchorMonth: string,
  from: string,
  to: string
): string[] {
  return monthRange(from, to).filter((month) =>
    firesInMonth(rule, month, sourceAnchorMonth)
  );
}

describe("firesInMonth", () => {
  it("a monthly rule fires in every month", () => {
    const months = monthRange("2026-01", "2027-12");
    expect(
      firingMonths({ frequency: "monthly" }, "2026-01", "2026-01", "2027-12")
    ).toEqual(months);
  });

  it("a quarterly rule with a month of year fires in every month of its cycle", () => {
    expect(
      firingMonths(
        { frequency: "quarterly", monthOfYear: 1 },
        "2026-01",
        "2026-01",
        "2027-03"
      )
    ).toEqual(["2026-01", "2026-04", "2026-07", "2026-10", "2027-01"]);
  });

  it("the current month's quarterly occurrence fires even when the run starts mid-cycle", () => {
    // A January-anchored quarterly rule is due in April; a run starting in
    // April must not skip it.
    expect(
      firesInMonth(
        { frequency: "quarterly", monthOfYear: 1 },
        "2026-04",
        "2026-04"
      )
    ).toBe(true);
  });

  it("a quarterly rule with a month of year ignores where its source account is anchored", () => {
    const rule = { frequency: "quarterly" as const, monthOfYear: 2 };
    const fromFebAnchor = firingMonths(rule, "2025-02", "2026-01", "2026-12");
    const fromJuneAnchor = firingMonths(rule, "2025-06", "2026-01", "2026-12");
    expect(fromFebAnchor).toEqual(["2026-02", "2026-05", "2026-08", "2026-11"]);
    expect(fromJuneAnchor).toEqual(fromFebAnchor);
  });

  it("an annual rule with a month of year fires only in that calendar month", () => {
    expect(
      firingMonths(
        { frequency: "annual", monthOfYear: 10 },
        "2025-03",
        "2025-03",
        "2027-12"
      )
    ).toEqual(["2025-10", "2026-10", "2027-10"]);
  });

  it("a legacy quarterly rule counts its cycle from its source account's Anchor month", () => {
    expect(
      firingMonths({ frequency: "quarterly" }, "2026-02", "2026-02", "2027-03")
    ).toEqual(["2026-02", "2026-05", "2026-08", "2026-11", "2027-02"]);
  });

  it("a legacy quarterly rule fires in the same months whichever month a run starts from", () => {
    const fromAnchor = firingMonths(
      { frequency: "quarterly" },
      "2026-02",
      "2026-02",
      "2027-12"
    ).filter((m) => m >= "2026-10");
    const fromOctober = firingMonths(
      { frequency: "quarterly" },
      "2026-02",
      "2026-10",
      "2027-12"
    );
    expect(fromOctober).toEqual(fromAnchor);
    expect(fromOctober).toEqual([
      "2026-11",
      "2027-02",
      "2027-05",
      "2027-08",
      "2027-11",
    ]);
  });

  it("a legacy annual rule counts its cycle from its source account's Anchor month", () => {
    expect(
      firingMonths({ frequency: "annual" }, "2025-07", "2025-07", "2027-12")
    ).toEqual(["2025-07", "2026-07", "2027-07"]);
  });
});

describe("occurrenceDate", () => {
  it("places the occurrence on the rule's day of month", () => {
    expect(occurrenceDate("2026-03", 5)).toBe("2026-03-05");
  });

  it("clamps the 31st to the last day of a 30-day month", () => {
    expect(occurrenceDate("2026-04", 31)).toBe("2026-04-30");
  });

  it("clamps the 31st to 28 February in a common year", () => {
    expect(occurrenceDate("2026-02", 31)).toBe("2026-02-28");
  });

  it("clamps the 31st to 29 February in a leap year", () => {
    expect(occurrenceDate("2028-02", 31)).toBe("2028-02-29");
  });
});

describe("passesAnchorGate", () => {
  it("blocks a leg dated on the Anchor Date", () => {
    expect(passesAnchorGate("2026-10-16", "2026-10-16")).toBe(false);
  });

  it("blocks a leg dated before the Anchor Date", () => {
    expect(passesAnchorGate("2026-10-16", "2026-10-01")).toBe(false);
  });

  it("passes a leg dated the day after the Anchor Date", () => {
    expect(passesAnchorGate("2026-10-16", "2026-10-17")).toBe(true);
  });

  it("passes every leg of an account with no anchor", () => {
    expect(passesAnchorGate(undefined, "2020-01-01")).toBe(true);
  });
});
