import { describe, it, expect } from "vitest";
import { percentPaidOff } from "./mortgage";

describe("percentPaidOff", () => {
  it("returns the portion of the original principal already repaid", () => {
    // 200,000 € repaid of a 400,000 € principal → 50% paid off.
    expect(percentPaidOff(40000000, 20000000)).toBe(50);
  });

  it("returns 0 when nothing has been repaid (Restschuld equals principal)", () => {
    expect(percentPaidOff(40000000, 40000000)).toBe(0);
  });

  it("returns 100 when the Restschuld has reached zero", () => {
    expect(percentPaidOff(40000000, 0)).toBe(100);
  });

  it("returns 0 when the original principal is zero (no divide-by-zero)", () => {
    expect(percentPaidOff(0, 0)).toBe(0);
  });

  it("clamps to 0 when the Restschuld exceeds the principal", () => {
    expect(percentPaidOff(40000000, 50000000)).toBe(0);
  });

  it("clamps to 100 and never exceeds it", () => {
    expect(percentPaidOff(40000000, -100)).toBe(100);
  });
});
