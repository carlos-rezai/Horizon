import { describe, it, expect } from "vitest";
import {
  buildRecurringInput,
  seedTransferForm,
  type RecurringFormValues,
} from "./transferForm";
import type { RecurringTransaction } from "../../../types/recurring";

const row = (
  overrides: Partial<RecurringTransaction>
): RecurringTransaction => ({
  id: "rt-1",
  accountId: "giro",
  amount: 95500,
  description: "Darlehen",
  category: "Housing",
  frequency: "monthly",
  dayOfMonth: 1,
  ...overrides,
});

describe("seedTransferForm", () => {
  it("seeds a transfer viewed from its source as To its destination", () => {
    const seed = seedTransferForm(row({ linkedAccountId: "mortgage" }), "giro");

    expect(seed).toEqual({
      direction: "to",
      counterpartId: "mortgage",
      amount: 95500,
    });
  });

  it("seeds a transfer viewed from its destination as From its source", () => {
    const seed = seedTransferForm(
      row({ linkedAccountId: "mortgage" }),
      "mortgage"
    );

    expect(seed).toEqual({
      direction: "from",
      counterpartId: "giro",
      amount: 95500,
    });
  });

  it("seeds the transfer amount as an absolute value", () => {
    const seed = seedTransferForm(
      row({ linkedAccountId: "mortgage", amount: -95500 }),
      "giro"
    );

    expect(seed.amount).toBe(95500);
  });

  it("keeps a plain recurring's stored sign and has no counterpart", () => {
    const seed = seedTransferForm(row({ amount: -4999 }), "giro");

    expect(seed).toEqual({ direction: "to", counterpartId: "", amount: -4999 });
  });
});

describe("buildRecurringInput", () => {
  const values: RecurringFormValues = {
    amount: 95500,
    description: "Darlehen",
    category: "Housing",
    frequency: "monthly",
    dayOfMonth: 1,
    counterpartId: "",
    direction: "to",
    monthOfYear: 11,
  };

  it("stores a plain recurring on the viewed account, with no link", () => {
    expect(buildRecurringInput(values, "giro")).toEqual({
      accountId: "giro",
      amount: 95500,
      description: "Darlehen",
      category: "Housing",
      frequency: "monthly",
      dayOfMonth: 1,
    });
  });

  it("stores a To transfer on the viewed account, linked to the counterpart", () => {
    const input = buildRecurringInput(
      { ...values, counterpartId: "mortgage", direction: "to" },
      "giro"
    );

    expect(input.accountId).toBe("giro");
    expect(input.linkedAccountId).toBe("mortgage");
  });

  it("flips the owner for a From transfer: the counterpart owns it", () => {
    const input = buildRecurringInput(
      { ...values, counterpartId: "giro", direction: "from" },
      "mortgage"
    );

    expect(input.accountId).toBe("giro");
    expect(input.linkedAccountId).toBe("mortgage");
  });

  it("ignores the direction for a plain recurring", () => {
    const input = buildRecurringInput({ ...values, direction: "from" }, "giro");

    expect(input.accountId).toBe("giro");
    expect(input).not.toHaveProperty("linkedAccountId");
  });

  it("sends monthOfYear only for an annual row", () => {
    expect(buildRecurringInput(values, "giro")).not.toHaveProperty(
      "monthOfYear"
    );
    expect(
      buildRecurringInput({ ...values, frequency: "annual" }, "giro")
        .monthOfYear
    ).toBe(11);
    expect(
      buildRecurringInput({ ...values, frequency: "quarterly" }, "giro")
    ).not.toHaveProperty("monthOfYear");
  });
});
