// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { ThemeProvider } from "styled-components";
import { MemoryRouter } from "react-router-dom";
import { theme } from "../../../tokens";
import type { Transaction } from "../../../types/transaction";
import MonthCard from "./MonthCard";

const mockUseAllMonthTransactions = vi.fn();
vi.mock("../useAllMonthTransactions", () => ({
  useAllMonthTransactions: (...args: unknown[]) =>
    mockUseAllMonthTransactions(...args),
}));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const ACCOUNT_IDS = ["acc-1", "acc-2"];

function renderMonthCard(month: string, accountIds: string[] = ACCOUNT_IDS) {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <MonthCard month={month} accountIds={accountIds} />
      </MemoryRouter>
    </ThemeProvider>
  );
}

const foodTransaction: Transaction = {
  id: "txn-1",
  accountId: "acc-1",
  date: "2026-05-10",
  amount: -5000,
  description: "Supermarket",
  category: "Food",
};

const healthTransaction: Transaction = {
  id: "txn-2",
  accountId: "acc-2",
  date: "2026-05-12",
  amount: -3000,
  description: "Dental",
  category: "Health",
};

const anotherFoodTransaction: Transaction = {
  id: "txn-3",
  accountId: "acc-1",
  date: "2026-05-20",
  amount: -2000,
  description: "Restaurant",
  category: "Food",
};

const incomeTransaction: Transaction = {
  id: "txn-4",
  accountId: "acc-1",
  date: "2026-05-01",
  amount: 323643,
  description: "Salary",
  category: "Income",
};

beforeEach(() => {
  mockUseAllMonthTransactions.mockReturnValue({
    transactions: [],
    isLoading: false,
  });
});

describe("MonthCard — month label and navigation", () => {
  it("renders the formatted month label", () => {
    renderMonthCard("2026-05");

    expect(screen.getByText("May 2026")).toBeInTheDocument();
  });

  it("renders a link to the month overview route", () => {
    renderMonthCard("2026-05");

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/months/2026-05");
  });
});

describe("MonthCard — total spent and count", () => {
  it("shows the total spent (sum of negative amounts as positive euros) for the month", () => {
    mockUseAllMonthTransactions.mockReturnValue({
      transactions: [foodTransaction, healthTransaction],
      isLoading: false,
    });

    renderMonthCard("2026-05");

    // -5000 + -3000 = -8000 cents = €80.00
    expect(screen.getByText(/80/)).toBeInTheDocument();
  });

  it("excludes positive-amount transactions from the total spent", () => {
    mockUseAllMonthTransactions.mockReturnValue({
      transactions: [foodTransaction, incomeTransaction],
      isLoading: false,
    });

    renderMonthCard("2026-05");

    // Only -5000 counts: €50.00 — income (323643) must not inflate the total
    expect(screen.getByText(/50/)).toBeInTheDocument();
  });

  it("shows the count of transactions for the month", () => {
    mockUseAllMonthTransactions.mockReturnValue({
      transactions: [foodTransaction, healthTransaction],
      isLoading: false,
    });

    renderMonthCard("2026-05");

    expect(screen.getByTestId("transaction-count")).toBeInTheDocument();
    expect(screen.getByTestId("transaction-count").textContent).toContain("2");
  });
});

describe("MonthCard — category bar", () => {
  it("renders one segment per unique category", () => {
    mockUseAllMonthTransactions.mockReturnValue({
      transactions: [
        foodTransaction,
        healthTransaction,
        anotherFoodTransaction,
      ],
      isLoading: false,
    });

    renderMonthCard("2026-05");

    expect(screen.getByTestId("category-segment-Food")).toBeInTheDocument();
    expect(screen.getByTestId("category-segment-Health")).toBeInTheDocument();
  });

  it("does not render a segment for categories with no spending (positive amounts)", () => {
    mockUseAllMonthTransactions.mockReturnValue({
      transactions: [foodTransaction, incomeTransaction],
      isLoading: false,
    });

    renderMonthCard("2026-05");

    expect(
      screen.queryByTestId("category-segment-Income")
    ).not.toBeInTheDocument();
  });
});

describe("MonthCard — empty state", () => {
  it("renders an empty state when no transactions exist for the month", () => {
    mockUseAllMonthTransactions.mockReturnValue({
      transactions: [],
      isLoading: false,
    });

    renderMonthCard("2026-05");

    expect(screen.getByText(/no transactions/i)).toBeInTheDocument();
  });

  it("does not render category segments in the empty state", () => {
    mockUseAllMonthTransactions.mockReturnValue({
      transactions: [],
      isLoading: false,
    });

    renderMonthCard("2026-05");

    expect(screen.queryByTestId(/category-segment/)).not.toBeInTheDocument();
  });
});
