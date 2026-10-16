import { describe, it, expect } from "vitest";
import {
  toCents,
  validate,
  validateRepayment,
  type FormValues,
} from "./mortgageSetupForm";

const valid: FormValues = {
  name: "Haus",
  restschuld: "89500",
  asOf: "2026-10-01",
  principal: "200000",
  startDate: "2022-10-01",
  term: "10",
  paidFrom: "giro-1",
  rate: "955",
  stAmount: "6500",
  stMonth: "11",
};

const errorOf = (values: Partial<FormValues>) => {
  const result = validate({ ...valid, ...values }, 3);
  return result.ok ? null : result.error;
};

describe("toCents", () => {
  it("parses a typed euro amount", () => {
    expect(toCents("955")).toBe(95500);
    expect(toCents("955.50")).toBe(95550);
  });

  it("is NaN for an empty field", () => {
    expect(toCents("  ")).toBeNaN();
  });
});

describe("validate", () => {
  it("builds the payload when every rule holds", () => {
    expect(validate(valid, 3)).toEqual({
      ok: true,
      payload: {
        name: "Haus",
        anchorBalance: 8950000,
        anchorDate: "2026-10-01",
        originalPrincipal: 20000000,
        startDate: "2022-10-01",
        termYears: 10,
        repayment: {
          paidFromAccountId: "giro-1",
          monthlyAmount: 95500,
          dayOfMonth: 3,
          sondertilgungAmount: 650000,
          sondertilgungMonth: 11,
        },
      },
    });
  });

  it.each([
    [{ name: "  " }, "Enter a name."],
    [{ restschuld: "" }, "Restschuld today must be above 0."],
    [{ restschuld: "0" }, "Restschuld today must be above 0."],
    [{ asOf: "" }, "Enter the as-of date."],
    [{ principal: "" }, "Enter the original principal."],
    [
      { principal: "80000" },
      "Original principal cannot be below the Restschuld today.",
    ],
    [{ startDate: "" }, "Enter the start date."],
    [{ startDate: "2026-11-01" }, "Start date cannot be after the as-of date."],
    [{ term: "0" }, "Term must be a whole number from 1 to 40 years."],
    [{ term: "41" }, "Term must be a whole number from 1 to 40 years."],
    [{ term: "7.5" }, "Term must be a whole number from 1 to 40 years."],
  ] as [Partial<FormValues>, string][])(
    "rejects %o with its message",
    (values, message) => {
      expect(errorOf(values)).toBe(message);
    }
  );

  it("reports the first broken rule", () => {
    expect(errorOf({ name: "", restschuld: "", term: "" })).toBe(
      "Enter a name."
    );
  });

  it("passes on the Repayment group's message", () => {
    expect(errorOf({ rate: "0" })).toBe("Monthly rate must be above 0.");
  });

  it("sends no repayment when both the rate and the Sondertilgung are blank", () => {
    const result = validate({ ...valid, rate: "", stAmount: "" }, 3);

    expect(result.ok && result.payload).not.toHaveProperty("repayment");
  });
});

describe("validateRepayment", () => {
  it("is no repayment when both the rate and the Sondertilgung are blank", () => {
    expect(
      validateRepayment({ ...valid, rate: " ", stAmount: "", paidFrom: "" }, 3)
    ).toEqual({ ok: true, repayment: undefined });
  });

  it.each([
    [{ paidFrom: "" }, "Choose the account the repayment is paid from."],
    [{ rate: "" }, "Monthly rate must be above 0."],
    [{ rate: "-955" }, "Monthly rate must be above 0."],
    [{ stAmount: "0" }, "Annual Sondertilgung must be above 0."],
    [{ stMonth: "" }, "Choose the month the Sondertilgung is paid in."],
  ] as [Partial<FormValues>, string][])(
    "rejects %o with its message",
    (values, message) => {
      expect(validateRepayment({ ...valid, ...values }, 3)).toEqual({
        ok: false,
        error: message,
      });
    }
  );

  it("sends the monthly rate alone when no Sondertilgung is typed", () => {
    expect(validateRepayment({ ...valid, stAmount: "" }, 3)).toEqual({
      ok: true,
      repayment: {
        paidFromAccountId: "giro-1",
        monthlyAmount: 95500,
        dayOfMonth: 3,
      },
    });
  });
});
