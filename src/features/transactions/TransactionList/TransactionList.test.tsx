// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../tokens";
import TransactionList from "./TransactionList";
import type { Transaction } from "../../../types/transaction";

afterEach(() => {
  cleanup();
});

const regularTransaction: Transaction = {
  _id: "txn-1",
  accountId: "acc-1",
  date: "2026-03-01",
  amount: -5000,
  description: "Groceries",
  category: "Food",
};

const transferTransaction: Transaction = {
  _id: "txn-2",
  accountId: "acc-1",
  date: "2026-03-10",
  amount: 50000,
  description: "Savings deposit",
  category: "Transfer",
  transferId: "transfer-abc",
};

const renderList = (
  transactions: Transaction[],
  onTransactionClick?: (tx: Transaction) => void
) =>
  render(
    <ThemeProvider theme={theme}>
      <TransactionList
        transactions={transactions}
        onTransactionClick={onTransactionClick}
      />
    </ThemeProvider>
  );

describe("TransactionList — empty state", () => {
  it("renders an empty state message when there are no transactions", () => {
    renderList([]);

    expect(screen.getByText(/no transactions/i)).toBeInTheDocument();
  });

  it("does not render a transaction row when the list is empty", () => {
    renderList([]);

    expect(screen.queryByRole("row")).not.toBeInTheDocument();
  });
});

describe("TransactionList — transfer indicator", () => {
  it("renders a transfer indicator on entries that have a transferId", () => {
    renderList([transferTransaction]);

    // The indicator can be an icon, badge, or text — match broadly
    const indicator = screen.getByText(/transfer/i);
    expect(indicator).toBeInTheDocument();
  });

  it("does not render a transfer indicator on regular transactions", () => {
    renderList([regularTransaction]);

    // Only description text "Groceries" present; no transfer badge/icon
    expect(screen.queryByTestId("transfer-indicator")).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/transfer/i)).not.toBeInTheDocument();
  });

  it("renders both a transfer indicator row and a plain row when the list is mixed", () => {
    renderList([regularTransaction, transferTransaction]);

    expect(screen.getByText("Groceries")).toBeInTheDocument();
    expect(screen.getByText("Savings deposit")).toBeInTheDocument();
  });
});

describe("TransactionList — row content", () => {
  it("renders the description and formatted euro amount for each transaction", () => {
    renderList([regularTransaction]);

    expect(screen.getByText("Groceries")).toBeInTheDocument();
    // -5000 cents = -50.00 €
    expect(screen.getByText(/-50[.,]00/)).toBeInTheDocument();
  });
});

describe("TransactionList — row click", () => {
  it("calls onTransactionClick with the transaction when a row is clicked", () => {
    const onTransactionClick = vi.fn();
    renderList([regularTransaction], onTransactionClick);

    fireEvent.click(screen.getByText("Groceries"));

    expect(onTransactionClick).toHaveBeenCalledWith(regularTransaction);
  });
});
