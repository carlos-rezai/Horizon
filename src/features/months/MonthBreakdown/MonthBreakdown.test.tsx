// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../tokens";
import type { Transaction } from "../../../types/transaction";
import MonthBreakdown from "./MonthBreakdown";

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: Math.random().toString(36).slice(2),
    accountId: "a1",
    date: "2026-06-03",
    amount: -1000,
    description: "Expense",
    category: "Food",
    ...overrides,
  };
}

function renderBreakdown(transactions: Transaction[]) {
  return render(
    <ThemeProvider theme={theme}>
      <MonthBreakdown transactions={transactions} />
    </ThemeProvider>
  );
}

afterEach(cleanup);

describe("MonthBreakdown", () => {
  it("renders the Breakdown / By category headings", () => {
    renderBreakdown([tx({ amount: -5000, category: "Groceries" })]);
    expect(screen.getByText("Breakdown")).toBeInTheDocument();
    expect(screen.getByText("By category")).toBeInTheDocument();
  });

  it("renders one legend row per spending category", () => {
    renderBreakdown([
      tx({ amount: -5000, category: "Groceries" }),
      tx({ amount: -3000, category: "Dining" }),
    ]);
    expect(screen.getAllByTestId("donut-legend-row")).toHaveLength(2);
  });

  it("shows an empty message when there is no spending", () => {
    renderBreakdown([]);
    expect(screen.getByText(/no spending to break down/i)).toBeInTheDocument();
  });
});
