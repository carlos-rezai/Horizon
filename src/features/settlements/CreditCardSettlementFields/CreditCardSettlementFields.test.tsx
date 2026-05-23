// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../tokens";
import type { AccountWithBalance } from "../../../types/account";
import CreditCardSettlementFields from "./CreditCardSettlementFields";

const mockGirokonto: AccountWithBalance = {
  id: "g-1",
  kind: "Girokonto",
  name: "Main Girokonto",
  openingBalance: 100000,
  openingDate: "2026-01-01",
  balance: 120000,
};

function renderFields(
  overrides: Partial<
    React.ComponentProps<typeof CreditCardSettlementFields>
  > = {}
) {
  const props = {
    girokontoAccounts: [mockGirokonto],
    linkedAccountId: "",
    settlementDay: "",
    onLinkedAccountChange: vi.fn(),
    onSettlementDayChange: vi.fn(),
    ...overrides,
  };
  render(
    <ThemeProvider theme={theme}>
      <CreditCardSettlementFields {...props} />
    </ThemeProvider>
  );
  return props;
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("CreditCardSettlementFields — rendering", () => {
  it("renders the Funding Account dropdown", () => {
    renderFields();
    expect(screen.getByLabelText(/funding account/i)).toBeInTheDocument();
  });

  it("renders the Settlement Day input", () => {
    renderFields();
    expect(screen.getByLabelText(/settlement day/i)).toBeInTheDocument();
  });

  it("lists each girokonto account as an option in the dropdown", () => {
    renderFields();
    const options = Array.from(
      screen.getByLabelText(/funding account/i).querySelectorAll("option")
    ).map((o) => o.textContent ?? "");
    expect(options.some((o) => /main girokonto/i.test(o))).toBe(true);
  });

  it("includes a blank none option in the Funding Account dropdown", () => {
    renderFields();
    const options = Array.from(
      screen.getByLabelText(/funding account/i).querySelectorAll("option")
    );
    expect(options.some((o) => o.value === "")).toBe(true);
  });
});

describe("CreditCardSettlementFields — callbacks", () => {
  it("calls onLinkedAccountChange with the selected account id", () => {
    const { onLinkedAccountChange } = renderFields();
    fireEvent.change(screen.getByLabelText(/funding account/i), {
      target: { value: "g-1" },
    });
    expect(onLinkedAccountChange).toHaveBeenCalledWith("g-1");
  });

  it("calls onSettlementDayChange with the entered day string", () => {
    const { onSettlementDayChange } = renderFields();
    fireEvent.change(screen.getByLabelText(/settlement day/i), {
      target: { value: "17" },
    });
    expect(onSettlementDayChange).toHaveBeenCalledWith("17");
  });
});

describe("CreditCardSettlementFields — styles stub", () => {
  it("has a co-located styles file", async () => {
    const mod = await import("./CreditCardSettlementFields.styles");
    expect(mod).toBeDefined();
  });
});
