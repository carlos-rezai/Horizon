import { describe, it, expect } from "vitest";
import { formatBalance, formatMonth } from "./format";

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
