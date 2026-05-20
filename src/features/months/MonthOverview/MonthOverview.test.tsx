// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { ThemeProvider } from "styled-components";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { theme } from "../../../tokens";
import type { AccountWithBalance } from "../../../types/account";
import type { MonthlySnapshot } from "../../../types/projection";
import type { RecurringTransaction } from "../../../types/recurring";
import type { Transaction } from "../../../types/transaction";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

const mockUseMonthTransactions = vi.fn();
vi.mock("../useMonthTransactions", () => ({
  useMonthTransactions: (...args: unknown[]) =>
    mockUseMonthTransactions(...args),
}));

vi.mock("../../../primitives/DatePicker/DatePicker", () => ({
  default: ({
    minDate,
    maxDate,
    "aria-label": ariaLabel,
  }: {
    minDate?: string;
    maxDate?: string;
    "aria-label"?: string;
  }) => (
    <input
      data-testid="datepicker"
      data-min={minDate}
      data-max={maxDate}
      aria-label={ariaLabel}
    />
  ),
}));

import MonthOverview from "./MonthOverview";

const emptyMonthTransactions = {
  transactions: [] as Transaction[],
  isLoading: false,
  error: null,
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
};

beforeEach(() => {
  mockUseMonthTransactions.mockReturnValue(emptyMonthTransactions);
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const mockAccounts: AccountWithBalance[] = [
  {
    id: "g1",
    kind: "Girokonto",
    name: "Main Checking",
    openingBalance: 100000,
    openingDate: "2026-01-01",
    balance: 150000,
  },
  {
    id: "t1",
    kind: "Tagesgeld",
    name: "DKB Reserve",
    openingBalance: 200000,
    openingDate: "2026-01-01",
    balance: 220000,
  },
];

const mockSnapshots: MonthlySnapshot[] = [
  {
    month: "2026-05",
    accounts: {
      g1: { projected: 145000 },
      t1: { projected: 215000, actual: 218000 },
    },
    netCashflow: 0,
    totalLiquid: 363000,
  },
  {
    month: "2026-06",
    accounts: {
      g1: { projected: 148000 },
      t1: { projected: 221000 },
    },
    netCashflow: 0,
    totalLiquid: 369000,
  },
];

function renderMonthOverview(
  month = "2026-05",
  accounts: AccountWithBalance[] = mockAccounts,
  snapshots: MonthlySnapshot[] = []
) {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[`/months/${month}`]}>
        <Routes>
          <Route
            path="/months/:month"
            element={
              <MonthOverview accounts={accounts} snapshots={snapshots} />
            }
          />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe("MonthOverview — rendering", () => {
  it("renders without crashing for a given month param", () => {
    expect(() => renderMonthOverview("2026-05")).not.toThrow();
  });
});

describe("MonthOverview — account tabs", () => {
  it("renders one tab per account", () => {
    renderMonthOverview();

    expect(
      screen.getByRole("tab", { name: "Main Checking" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "DKB Reserve" })
    ).toBeInTheDocument();
  });

  it("first account tab is selected by default", () => {
    renderMonthOverview();

    const firstTab = screen.getByRole("tab", { name: "Main Checking" });
    expect(firstTab).toHaveAttribute("aria-selected", "true");
  });

  it("clicking a tab makes it the active tab", () => {
    renderMonthOverview();

    fireEvent.click(screen.getByRole("tab", { name: "DKB Reserve" }));

    expect(screen.getByRole("tab", { name: "DKB Reserve" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByRole("tab", { name: "Main Checking" })).toHaveAttribute(
      "aria-selected",
      "false"
    );
  });
});

describe("MonthOverview — back navigation", () => {
  it("clicking the back button calls navigate(-1)", () => {
    renderMonthOverview();

    fireEvent.click(screen.getByRole("button", { name: /back/i }));

    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });
});

describe("MonthOverview — balance summary bar", () => {
  it("renders the projected balance for each account for the selected month", () => {
    renderMonthOverview("2026-05", mockAccounts, mockSnapshots);

    // g1 projected: 145000 cents = 1,450.00 €
    expect(screen.getByText(/1[.,]450/)).toBeInTheDocument();
  });

  it("shows actual balance instead of projected when actual data is present", () => {
    renderMonthOverview("2026-05", mockAccounts, mockSnapshots);

    // t1 actual: 218000 cents = 2,180.00 € (not projected 215000 = 2,150)
    expect(screen.getByText(/2[.,]180/)).toBeInTheDocument();
    expect(screen.queryByText(/2[.,]150/)).not.toBeInTheDocument();
  });

  it("shows the correct snapshot values when the month param changes", () => {
    renderMonthOverview("2026-06", mockAccounts, mockSnapshots);

    // g1 projected for 2026-06: 148000 cents = 1,480.00 €
    expect(screen.getByText(/1[.,]480/)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Helpers and fixtures for Monthly Ledger tests
// ---------------------------------------------------------------------------

const mockGiroRecurring: RecurringTransaction = {
  id: "rt-1",
  accountId: "g1",
  amount: 323643,
  description: "Salary",
  category: "Income",
  frequency: "monthly",
  dayOfMonth: 1,
};

const mockTagRecurring: RecurringTransaction = {
  id: "rt-2",
  accountId: "t1",
  amount: -70000,
  description: "Savings transfer",
  category: "Transfer",
  frequency: "monthly",
  dayOfMonth: 5,
};

const mockGiroTransaction: Transaction = {
  id: "txn-g1",
  accountId: "g1",
  date: "2026-05-10",
  amount: -5000,
  description: "Supermarket",
  category: "Food",
};

const mockTagTransaction: Transaction = {
  id: "txn-t1",
  accountId: "t1",
  date: "2026-05-12",
  amount: -3000,
  description: "Dental",
  category: "Health",
};

function renderMonthOverviewWithLedger(
  month = "2026-05",
  accounts: AccountWithBalance[] = mockAccounts,
  recurringTransactionsByAccount: Record<string, RecurringTransaction[]> = {}
) {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[`/months/${month}`]}>
        <Routes>
          <Route
            path="/months/:month"
            element={
              <MonthOverview
                accounts={accounts}
                recurringTransactionsByAccount={recurringTransactionsByAccount}
              />
            }
          />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  );
}

// ---------------------------------------------------------------------------
// MonthOverview — Recurring This Month section
// ---------------------------------------------------------------------------

describe("MonthOverview — Recurring This Month section", () => {
  it("renders a 'Recurring this month' heading", () => {
    renderMonthOverviewWithLedger("2026-05", mockAccounts, {
      g1: [mockGiroRecurring],
      t1: [],
    });

    expect(
      screen.getByRole("heading", { name: /recurring this month/i })
    ).toBeInTheDocument();
  });

  it("renders the recurring transaction description for the active account", () => {
    renderMonthOverviewWithLedger("2026-05", mockAccounts, {
      g1: [mockGiroRecurring],
      t1: [],
    });

    expect(screen.getByText("Salary")).toBeInTheDocument();
  });

  it("shows the selected account's recurring transactions after tab switch", () => {
    renderMonthOverviewWithLedger("2026-05", mockAccounts, {
      g1: [mockGiroRecurring],
      t1: [mockTagRecurring],
    });

    fireEvent.click(screen.getByRole("tab", { name: "DKB Reserve" }));

    expect(screen.getByText("Savings transfer")).toBeInTheDocument();
    expect(screen.queryByText("Salary")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// MonthOverview — one-off transaction list
// ---------------------------------------------------------------------------

describe("MonthOverview — one-off transaction list", () => {
  it("renders one-off transaction rows returned by useMonthTransactions", () => {
    mockUseMonthTransactions.mockReturnValue({
      ...emptyMonthTransactions,
      transactions: [mockGiroTransaction],
    });

    renderMonthOverviewWithLedger();

    expect(screen.getByText("Supermarket")).toBeInTheDocument();
  });

  it("renders an empty state when no one-off transactions exist for the month", () => {
    mockUseMonthTransactions.mockReturnValue(emptyMonthTransactions);

    renderMonthOverviewWithLedger();

    expect(screen.getByText(/no transactions this month/i)).toBeInTheDocument();
  });

  it("switches to the newly selected account's transactions when a tab is clicked", () => {
    mockUseMonthTransactions.mockImplementation((accountId: string) => {
      if (accountId === "g1") {
        return {
          ...emptyMonthTransactions,
          transactions: [mockGiroTransaction],
        };
      }
      return {
        ...emptyMonthTransactions,
        transactions: [mockTagTransaction],
      };
    });

    renderMonthOverviewWithLedger();

    expect(screen.getByText("Supermarket")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("tab", { name: "DKB Reserve" }));

    expect(screen.getByText("Dental")).toBeInTheDocument();
    expect(screen.queryByText("Supermarket")).not.toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// MonthOverview — add transaction form
// ---------------------------------------------------------------------------

describe("MonthOverview — add transaction form", () => {
  it("renders an 'Add transaction' button", () => {
    renderMonthOverviewWithLedger();

    expect(
      screen.getByRole("button", { name: /add transaction/i })
    ).toBeInTheDocument();
  });

  it("reveals the add form when the 'Add transaction' button is clicked", () => {
    renderMonthOverviewWithLedger();

    fireEvent.click(screen.getByRole("button", { name: /add transaction/i }));

    expect(screen.getByTestId("datepicker")).toBeInTheDocument();
  });

  it("constrains the DatePicker to the first and last day of the selected month", () => {
    renderMonthOverviewWithLedger("2026-05");

    fireEvent.click(screen.getByRole("button", { name: /add transaction/i }));

    const datepicker = screen.getByTestId("datepicker");
    expect(datepicker).toHaveAttribute("data-min", "2026-05-01");
    expect(datepicker).toHaveAttribute("data-max", "2026-05-31");
  });
});
