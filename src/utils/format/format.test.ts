import { describe, it, expect } from "vitest";
import {
  formatBalance,
  formatBytes,
  formatMonth,
  formatMonthLong,
  toOrdinal,
} from "./format";

describe("formatBalance", () => {
  it("formats a positive cent value as a German-locale EUR string", () => {
    expect(formatBalance(100000)).toBe("1.000,00 €");
  });

  it("formats a small positive value", () => {
    expect(formatBalance(150)).toBe("1,50 €");
  });

  it("formats zero", () => {
    expect(formatBalance(0)).toBe("0,00 €");
  });

  it("formats a negative value", () => {
    expect(formatBalance(-5050)).toBe("-50,50 €");
  });
});

describe("formatBytes", () => {
  it("formats zero bytes", () => {
    expect(formatBytes(0)).toBe("0 B");
  });

  it("formats a sub-kilobyte value in bytes with no decimals", () => {
    expect(formatBytes(512)).toBe("512 B");
  });

  it("formats an exact kilobyte without a trailing decimal", () => {
    expect(formatBytes(2048)).toBe("2 KB");
  });

  it("formats a megabyte value with a German-locale decimal comma", () => {
    // 2_517_172 / 1024 / 1024 = 2.40… → de-DE one fraction digit
    expect(formatBytes(2_517_172)).toBe("2,4 MB");
  });

  it("formats an exact megabyte without a trailing decimal", () => {
    expect(formatBytes(5_242_880)).toBe("5 MB");
  });

  it("formats a gigabyte value", () => {
    expect(formatBytes(1_073_741_824)).toBe("1 GB");
  });
});

describe("formatMonth", () => {
  it("maps January", () => expect(formatMonth("2024-01")).toBe("Jan 2024"));
  it("maps February", () => expect(formatMonth("2024-02")).toBe("Feb 2024"));
  it("maps March", () => expect(formatMonth("2024-03")).toBe("Mar 2024"));
  it("maps April", () => expect(formatMonth("2024-04")).toBe("Apr 2024"));
  it("maps May", () => expect(formatMonth("2024-05")).toBe("May 2024"));
  it("maps June", () => expect(formatMonth("2024-06")).toBe("Jun 2024"));
  it("maps July", () => expect(formatMonth("2024-07")).toBe("Jul 2024"));
  it("maps August", () => expect(formatMonth("2024-08")).toBe("Aug 2024"));
  it("maps September", () => expect(formatMonth("2024-09")).toBe("Sep 2024"));
  it("maps October", () => expect(formatMonth("2024-10")).toBe("Oct 2024"));
  it("maps November", () => expect(formatMonth("2024-11")).toBe("Nov 2024"));
  it("maps December", () => expect(formatMonth("2024-12")).toBe("Dec 2024"));
});

describe("formatMonthLong", () => {
  it("maps January to the full month name", () =>
    expect(formatMonthLong("2031-01")).toBe("January 2031"));
  it("maps October to the full month name", () =>
    expect(formatMonthLong("2031-10")).toBe("October 2031"));
  it("maps December to the full month name", () =>
    expect(formatMonthLong("2026-12")).toBe("December 2026"));
});

describe("toOrdinal", () => {
  it("converts 1 to '1st'", () => expect(toOrdinal(1)).toBe("1st"));
  it("converts 2 to '2nd'", () => expect(toOrdinal(2)).toBe("2nd"));
  it("converts 3 to '3rd'", () => expect(toOrdinal(3)).toBe("3rd"));
  it("converts 4 to '4th'", () => expect(toOrdinal(4)).toBe("4th"));
  it("converts 11 to '11th' (teen exception)", () =>
    expect(toOrdinal(11)).toBe("11th"));
  it("converts 12 to '12th' (teen exception)", () =>
    expect(toOrdinal(12)).toBe("12th"));
  it("converts 13 to '13th' (teen exception)", () =>
    expect(toOrdinal(13)).toBe("13th"));
  it("converts 20 to '20th'", () => expect(toOrdinal(20)).toBe("20th"));
  it("converts 21 to '21st'", () => expect(toOrdinal(21)).toBe("21st"));
  it("converts 22 to '22nd'", () => expect(toOrdinal(22)).toBe("22nd"));
  it("converts 23 to '23rd'", () => expect(toOrdinal(23)).toBe("23rd"));
  it("converts 31 to '31st'", () => expect(toOrdinal(31)).toBe("31st"));
});
