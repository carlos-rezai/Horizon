// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../tokens";
import RecurringTransactionList from "./RecurringTransactionList";
import type { RecurringTransaction } from "../../../types/recurring";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const rt: RecurringTransaction = {
  id: "rt-1",
  accountId: "acc-1",
  amount: -120000,
  description: "Rent",
  category: "Housing",
  frequency: "monthly",
  dayOfMonth: 5,
};

const linkedRt: RecurringTransaction = {
  id: "rt-3",
  accountId: "acc-1",
  amount: -50000,
  description: "Savings deposit",
  category: "Transfer",
  frequency: "monthly",
  dayOfMonth: 25,
  linkedAccountId: "acc-2",
};

const renderRtList = (
  recurringTransactions: RecurringTransaction[],
  overrides: Partial<{
    onRowClick: (rt: RecurringTransaction) => void;
  }> = {}
) => {
  const props = {
    recurringTransactions,
    onRowClick: vi.fn(),
    ...overrides,
  };
  render(
    <ThemeProvider theme={theme}>
      <RecurringTransactionList {...props} />
    </ThemeProvider>
  );
  return props;
};

describe("RecurringTransactionList — row content", () => {
  it("renders description, frequency, and day of month for each entry", () => {
    renderRtList([rt]);

    expect(screen.getByText("Rent")).toBeInTheDocument();
    expect(screen.getByText(/monthly/i)).toBeInTheDocument();
    expect(screen.getByText(/5/)).toBeInTheDocument();
  });

  it("renders the amount in euros", () => {
    renderRtList([rt]);

    // -120000 cents = -1200.00 euros
    expect(screen.getByText(/-1[.,]200/)).toBeInTheDocument();
  });

  it("renders a linked account indicator when linkedAccountId is set", () => {
    renderRtList([linkedRt]);

    expect(screen.getByTestId("linked-account-indicator")).toBeInTheDocument();
  });

  it("does not render a checkbox column", () => {
    renderRtList([rt]);

    expect(screen.queryByRole("checkbox")).toBeNull();
  });
});

describe("RecurringTransactionList — interactions", () => {
  it("calls onRowClick with the recurring transaction when the row is clicked", () => {
    const onRowClick = vi.fn();
    renderRtList([rt], { onRowClick });

    fireEvent.click(screen.getByText("Rent"));

    expect(onRowClick).toHaveBeenCalledWith(rt);
  });
});

describe("RecurringTransactionList — column headers", () => {
  it("renders column headers: Name, Amount, Frequency, Day", () => {
    renderRtList([rt]);

    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Amount")).toBeInTheDocument();
    expect(screen.getByText("Frequency")).toBeInTheDocument();
    expect(screen.getByText("Day")).toBeInTheDocument();
  });
});

describe("RecurringTransactionList — ordinal day", () => {
  it("renders dayOfMonth as an ordinal (5 → '5th')", () => {
    renderRtList([rt]);

    expect(screen.getByText("5th")).toBeInTheDocument();
  });

  it("renders ordinals for edge cases (1st, 2nd, 22nd)", () => {
    const fixtures: RecurringTransaction[] = [
      { ...rt, id: "rt-a", dayOfMonth: 1, description: "First" },
      { ...rt, id: "rt-b", dayOfMonth: 2, description: "Second" },
      { ...rt, id: "rt-c", dayOfMonth: 22, description: "TwentySecond" },
    ];
    renderRtList(fixtures);

    expect(screen.getByText("1st")).toBeInTheDocument();
    expect(screen.getByText("2nd")).toBeInTheDocument();
    expect(screen.getByText("22nd")).toBeInTheDocument();
  });
});

describe("RecurringTransactionList — empty state", () => {
  it("renders an empty state message when the list is empty", () => {
    renderRtList([]);

    expect(screen.getByText(/no recurring transactions/i)).toBeInTheDocument();
  });
});
