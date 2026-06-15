// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { ThemeProvider } from "styled-components";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { theme } from "../../../tokens";
import type { AccountWithBalance } from "../../../types/account";
import type { Transaction } from "../../../types/transaction";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockUseAllMonthTransactions = vi.fn();
vi.mock("../useAllMonthTransactions", () => ({
  useAllMonthTransactions: (...args: unknown[]) =>
    mockUseAllMonthTransactions(...args),
}));

let capturedOnDeleted: ((id: string, transferId?: string) => void) | null =
  null;

vi.mock(
  "../../transactions/TransactionCreateModal/TransactionCreateModal",
  () => ({
    default: (props: { accountId: string; onClose: () => void }) => (
      <div
        data-testid="transaction-create-modal"
        data-account-id={props.accountId}
      >
        <button onClick={props.onClose}>Cancel</button>
      </div>
    ),
  })
);

vi.mock("../../transactions/TransactionEditModal/TransactionEditModal", () => ({
  default: (props: {
    transaction: Transaction;
    onDeleted: (id: string, transferId?: string) => void;
  }) => {
    capturedOnDeleted = props.onDeleted;
    return (
      <div
        data-testid="transaction-edit-modal"
        data-transaction-id={props.transaction.id}
      />
    );
  },
}));

import MonthOverview from "./MonthOverview";

const accounts: AccountWithBalance[] = [
  {
    id: "main",
    kind: "Girokonto",
    name: "Main",
    openingBalance: 0,
    openingDate: "2026-01-01",
    balance: 0,
    color: "#7FA7D9",
  },
  {
    id: "visa",
    kind: "CreditCard",
    name: "Visa",
    openingBalance: 0,
    openingDate: "2026-01-01",
    balance: 0,
    color: "#C9897F",
  },
  {
    id: "mortgage",
    kind: "Mortgage",
    name: "Mortgage",
    openingBalance: 0,
    openingDate: "2026-01-01",
    balance: 0,
  },
];

const transactions: Transaction[] = [
  {
    id: "t1",
    accountId: "main",
    date: "2026-06-09",
    amount: -3420,
    description: "Cat food",
    category: "Cat",
  },
  {
    id: "t2",
    accountId: "visa",
    date: "2026-06-07",
    amount: -11930,
    description: "Zalando",
    category: "Shopping",
  },
  {
    id: "t3",
    accountId: "main",
    date: "2026-06-12",
    amount: -50000,
    description: "Move to savings",
    category: "Transfer",
    transferId: "tr-1",
  },
];

const refetch = vi.fn();

beforeEach(() => {
  mockUseAllMonthTransactions.mockReturnValue({
    transactions,
    isLoading: false,
    refetch,
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  capturedOnDeleted = null;
});

function renderOverview(month = "2026-06") {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[`/months/${month}`]}>
        <Routes>
          <Route
            path="/months/:month"
            element={<MonthOverview accounts={accounts} />}
          />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe("MonthOverview — header", () => {
  it("renders the Month Overview title and subtitle", () => {
    renderOverview();
    expect(
      screen.getByRole("heading", { name: "Month Overview" })
    ).toBeInTheDocument();
    expect(
      screen.getByText("Variable spending · Recurring-Only Model")
    ).toBeInTheDocument();
  });

  it("renders the month overline", () => {
    renderOverview();
    expect(screen.getByText("June 2026")).toBeInTheDocument();
  });
});

describe("MonthOverview — month stepper", () => {
  it("steps back a month", () => {
    renderOverview("2026-06");
    fireEvent.click(screen.getByRole("button", { name: /previous month/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/months/2026-05");
  });

  it("steps forward a month", () => {
    renderOverview("2026-06");
    fireEvent.click(screen.getByRole("button", { name: /next month/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/months/2026-07");
  });

  it("wraps the year at December", () => {
    renderOverview("2026-12");
    fireEvent.click(screen.getByRole("button", { name: /next month/i }));
    expect(mockNavigate).toHaveBeenCalledWith("/months/2027-01");
  });
});

describe("MonthOverview — composition", () => {
  it("renders the stat strip", () => {
    renderOverview();
    expect(screen.getByTestId("month-stat-strip")).toBeInTheDocument();
  });

  it("renders the spending list with variable spending rows", () => {
    renderOverview();
    expect(screen.getByText("Cat food")).toBeInTheDocument();
    expect(screen.getByText("Zalando")).toBeInTheDocument();
  });

  it("excludes transfers from the spending list", () => {
    renderOverview();
    expect(screen.queryByText("Move to savings")).not.toBeInTheDocument();
  });

  it("renders the breakdown card", () => {
    renderOverview();
    expect(screen.getByText("By category")).toBeInTheDocument();
  });

  it("renders the Planned year-comparison placeholder", () => {
    renderOverview();
    expect(screen.getByText("Planned")).toBeInTheDocument();
  });

  it("does not tab the Mortgage account", () => {
    renderOverview();
    expect(
      screen.queryByRole("tab", { name: /Mortgage/ })
    ).not.toBeInTheDocument();
  });
});

describe("MonthOverview — add expense", () => {
  it("opens the create modal for the active account", () => {
    renderOverview();
    fireEvent.click(screen.getByRole("button", { name: /add expense/i }));
    const modal = screen.getByTestId("transaction-create-modal");
    expect(modal).toBeInTheDocument();
    expect(modal).toHaveAttribute("data-account-id", "main");
  });

  it("closes the create modal on cancel", () => {
    renderOverview();
    fireEvent.click(screen.getByRole("button", { name: /add expense/i }));
    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));
    expect(
      screen.queryByTestId("transaction-create-modal")
    ).not.toBeInTheDocument();
  });
});

describe("MonthOverview — edit and delete", () => {
  it("opens the edit modal with the clicked transaction", () => {
    renderOverview();
    fireEvent.click(screen.getByText("Cat food"));
    expect(screen.getByTestId("transaction-edit-modal")).toHaveAttribute(
      "data-transaction-id",
      "t1"
    );
  });

  it("refetches after a delete", () => {
    renderOverview();
    fireEvent.click(screen.getByText("Cat food"));
    capturedOnDeleted?.("t1");
    expect(refetch).toHaveBeenCalled();
  });
});
