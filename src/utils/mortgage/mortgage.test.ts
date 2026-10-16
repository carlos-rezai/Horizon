import { describe, it, expect } from "vitest";
import { percentPaidOff, hasRepaymentTransfer } from "./mortgage";
import type { RecurringTransaction } from "../../types/recurring";

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

function recurring(
  overrides: Partial<RecurringTransaction>
): RecurringTransaction {
  return {
    id: "rec-1",
    accountId: "giro-1",
    amount: 150000,
    description: "Darlehensrate",
    category: "Housing",
    frequency: "monthly",
    dayOfMonth: 1,
    ...overrides,
  };
}

describe("hasRepaymentTransfer", () => {
  it("is true when a recurring transfer is linked to that mortgage", () => {
    const recurrings = [recurring({ linkedAccountId: "mortgage-1" })];
    expect(hasRepaymentTransfer(recurrings, "mortgage-1")).toBe(true);
  });

  it("is true for an annual transfer linked to that mortgage", () => {
    const recurrings = [
      recurring({
        frequency: "annual",
        monthOfYear: 11,
        linkedAccountId: "mortgage-1",
      }),
    ];
    expect(hasRepaymentTransfer(recurrings, "mortgage-1")).toBe(true);
  });

  it("is false when there are no recurring transactions", () => {
    expect(hasRepaymentTransfer([], "mortgage-1")).toBe(false);
  });

  it("is false when no recurring is linked to any account", () => {
    const recurrings = [recurring({ description: "Gehalt", amount: 300000 })];
    expect(hasRepaymentTransfer(recurrings, "mortgage-1")).toBe(false);
  });

  it("is false when the only transfer is linked to a different account", () => {
    const recurrings = [recurring({ linkedAccountId: "mortgage-2" })];
    expect(hasRepaymentTransfer(recurrings, "mortgage-1")).toBe(false);
  });

  it("is false for an unlinked recurring that sits on the mortgage account itself", () => {
    const recurrings = [recurring({ accountId: "mortgage-1" })];
    expect(hasRepaymentTransfer(recurrings, "mortgage-1")).toBe(false);
  });
});
