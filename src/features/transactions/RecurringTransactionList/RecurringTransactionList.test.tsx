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

const activeRt: RecurringTransaction = {
  id: "rt-1",
  accountId: "acc-1",
  amount: -120000,
  description: "Rent",
  category: "Housing",
  frequency: "monthly",
  dayOfMonth: 5,
  isActive: true,
};

const inactiveRt: RecurringTransaction = {
  id: "rt-2",
  accountId: "acc-1",
  amount: -2000,
  description: "Spotify",
  category: "Entertainment",
  frequency: "monthly",
  dayOfMonth: 15,
  isActive: false,
};

const linkedRt: RecurringTransaction = {
  id: "rt-3",
  accountId: "acc-1",
  amount: -50000,
  description: "Savings deposit",
  category: "Transfer",
  frequency: "monthly",
  dayOfMonth: 25,
  isActive: true,
  linkedAccountId: "acc-2",
};

const renderRtList = (
  recurringTransactions: RecurringTransaction[],
  overrides: Partial<{
    onToggle: (rt: RecurringTransaction) => void;
    onRowClick: (rt: RecurringTransaction) => void;
  }> = {}
) => {
  const props = {
    recurringTransactions,
    onToggle: vi.fn(),
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
    renderRtList([activeRt]);

    expect(screen.getByText("Rent")).toBeInTheDocument();
    expect(screen.getByText(/monthly/i)).toBeInTheDocument();
    expect(screen.getByText(/5/)).toBeInTheDocument();
  });

  it("renders the amount in euros", () => {
    renderRtList([activeRt]);

    // -120000 cents = -1200.00 euros
    expect(screen.getByText(/-1[.,]200/)).toBeInTheDocument();
  });

  it("renders a linked account indicator when linkedAccountId is set", () => {
    renderRtList([linkedRt]);

    expect(screen.getByTestId("linked-account-indicator")).toBeInTheDocument();
  });
});

describe("RecurringTransactionList — inactive state", () => {
  it("marks inactive entries with a data-inactive attribute", () => {
    renderRtList([activeRt, inactiveRt]);

    const rows = screen.getAllByRole("listitem");
    const inactiveRow = rows.find((r) => r.textContent?.includes("Spotify"));
    expect(inactiveRow).toHaveAttribute("data-inactive", "true");
  });

  it("does not mark active entries as inactive", () => {
    renderRtList([activeRt]);

    const rows = screen.getAllByRole("listitem");
    rows.forEach((row) => {
      expect(row).not.toHaveAttribute("data-inactive", "true");
    });
  });
});

describe("RecurringTransactionList — interactions", () => {
  it("calls onToggle with the recurring transaction when the toggle is clicked", () => {
    const onToggle = vi.fn();
    renderRtList([activeRt], { onToggle });

    fireEvent.click(screen.getByRole("checkbox"));

    expect(onToggle).toHaveBeenCalledWith(activeRt);
  });

  it("calls onRowClick with the recurring transaction when the row is clicked", () => {
    const onRowClick = vi.fn();
    renderRtList([activeRt], { onRowClick });

    fireEvent.click(screen.getByText("Rent"));

    expect(onRowClick).toHaveBeenCalledWith(activeRt);
  });

  it("does not fire onRowClick when the toggle is clicked", () => {
    const onRowClick = vi.fn();
    renderRtList([activeRt], { onRowClick });

    fireEvent.click(screen.getByRole("checkbox"));

    expect(onRowClick).not.toHaveBeenCalled();
  });
});

describe("RecurringTransactionList — empty state", () => {
  it("renders an empty state message when the list is empty", () => {
    renderRtList([]);

    expect(screen.getByText(/no recurring transactions/i)).toBeInTheDocument();
  });
});
