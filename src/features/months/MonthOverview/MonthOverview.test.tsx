// @vitest-environment jsdom
import { type ReactNode } from "react";
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { ThemeProvider } from "styled-components";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { theme } from "../../../tokens";
import CacheProvider from "../../../components/CacheProvider/CacheProvider";
import { useAccounts } from "../../accounts/useAccounts";
import { useProjection } from "../../projection/useProjection";
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

const mockUseYearComparison = vi.fn();
vi.mock("../useYearComparison", () => ({
  useYearComparison: (...args: unknown[]) => mockUseYearComparison(...args),
}));

const mockUseImportStartDates = vi.fn();
vi.mock("../useImportStartDates", () => ({
  useImportStartDates: (...args: unknown[]) => mockUseImportStartDates(...args),
}));

let capturedOnDeleted: ((id: string, transferId?: string) => void) | null =
  null;
let capturedOnSuccess: (() => void) | null = null;

vi.mock(
  "../../transactions/TransactionCreateModal/TransactionCreateModal",
  () => ({
    default: (props: {
      accountId: string;
      onClose: () => void;
      onSuccess: () => void;
    }) => {
      capturedOnSuccess = props.onSuccess;
      return (
        <div
          data-testid="transaction-create-modal"
          data-account-id={props.accountId}
        >
          <button onClick={props.onClose}>Cancel</button>
        </div>
      );
    },
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
  mockUseYearComparison.mockReturnValue({
    rows: [{ category: "Groceries", thisYear: 12000, lastYear: 9000 }],
    isLoading: false,
  });
  mockUseImportStartDates.mockReturnValue({
    startDates: [],
    isLoading: false,
  });
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
  capturedOnDeleted = null;
  capturedOnSuccess = null;
});

function renderOverview(month = "2026-06", extra?: ReactNode) {
  return render(
    <CacheProvider>
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={[`/months/${month}`]}>
          <Routes>
            <Route
              path="/months/:month"
              element={<MonthOverview accounts={accounts} />}
            />
          </Routes>
          {extra}
        </MemoryRouter>
      </ThemeProvider>
    </CacheProvider>
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
    expect(
      screen.getByText("June 2026", { selector: "div" })
    ).toBeInTheDocument();
  });

  it("renders the MonthYearPicker trigger for the current month", () => {
    renderOverview();
    expect(
      screen.getByRole("button", { name: /June 2026/i })
    ).toBeInTheDocument();
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

  it("renders the data-backed year-comparison card", () => {
    renderOverview();
    expect(screen.getByText("Year comparison")).toBeInTheDocument();
    expect(screen.getByTestId("yc-row")).toBeInTheDocument();
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

/**
 * Reads the two resources a transaction mutation is supposed to bump, so a
 * test can watch them refetch without knowing how the bump is delivered.
 */
function BumpProbes() {
  useAccounts();
  useProjection();
  return null;
}

function countRequests(predicate: (url: string) => boolean): number {
  return vi
    .mocked(fetch)
    .mock.calls.map(([url]) => String(url))
    .filter(predicate).length;
}

const isAccountsList = (url: string) => url.endsWith("/accounts");
const isProjection = (url: string) => url.includes("/projection");

describe("MonthOverview — explicit bump", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response);
  });

  it("refetches accounts and the projection after an expense is recorded", async () => {
    renderOverview("2026-06", <BumpProbes />);

    await waitFor(() => {
      expect(countRequests(isAccountsList)).toBeGreaterThan(0);
    });
    fireEvent.click(screen.getByRole("button", { name: /add expense/i }));

    const accountsBefore = countRequests(isAccountsList);
    const projectionBefore = countRequests(isProjection);

    act(() => {
      capturedOnSuccess?.();
    });

    await waitFor(() => {
      expect(countRequests(isAccountsList)).toBeGreaterThan(accountsBefore);
    });
    expect(countRequests(isProjection)).toBeGreaterThan(projectionBefore);
  });

  it("refetches accounts and the projection after a delete", async () => {
    renderOverview("2026-06", <BumpProbes />);

    await waitFor(() => {
      expect(countRequests(isAccountsList)).toBeGreaterThan(0);
    });
    fireEvent.click(screen.getByText("Cat food"));

    const accountsBefore = countRequests(isAccountsList);
    const projectionBefore = countRequests(isProjection);

    act(() => {
      capturedOnDeleted?.("t1");
    });

    await waitFor(() => {
      expect(countRequests(isAccountsList)).toBeGreaterThan(accountsBefore);
    });
    expect(countRequests(isProjection)).toBeGreaterThan(projectionBefore);
  });
});
