// @vitest-environment jsdom
import { type ReactNode } from "react";
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { ThemeProvider } from "styled-components";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { theme } from "../../../tokens";
import CacheProvider from "../../../components/CacheProvider/CacheProvider";
import SnackbarProvider from "../../../components/SnackbarProvider/SnackbarProvider";
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

/**
 * The draft a create modal hands back — the modal collects it, the page owns
 * the network, so the optimistic path lives in one place.
 */
interface TransactionDraft {
  date: string;
  amount: number;
  description: string;
  category: string;
  toAccountId?: string;
}

const COFFEE: TransactionDraft = {
  date: "2026-06-15",
  amount: -450,
  description: "Coffee",
  category: "Food",
};

const CORRECTED = {
  date: "2026-06-09",
  amount: -3420,
  description: "Cat food (corrected)",
  category: "Cat",
};

vi.mock(
  "../../transactions/TransactionCreateModal/TransactionCreateModal",
  () => ({
    default: (props: {
      accountId: string;
      onClose: () => void;
      onSubmit: (draft: TransactionDraft) => void;
    }) => (
      <div
        data-testid="transaction-create-modal"
        data-account-id={props.accountId}
      >
        <button onClick={() => props.onSubmit(COFFEE)}>Add transaction</button>
        <button onClick={props.onClose}>Cancel</button>
      </div>
    ),
  })
);

vi.mock("../../transactions/TransactionEditModal/TransactionEditModal", () => ({
  default: (props: {
    transaction: Transaction;
    onSave: (changes: typeof CORRECTED) => void;
    onDelete: () => void;
  }) => (
    <div
      data-testid="transaction-edit-modal"
      data-transaction-id={props.transaction.id}
    >
      <button onClick={() => props.onSave(CORRECTED)}>Save</button>
      <button onClick={props.onDelete}>Delete</button>
    </div>
  ),
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
const create = vi.fn();
const update = vi.fn();
const remove = vi.fn();

beforeEach(() => {
  mockUseAllMonthTransactions.mockReturnValue({
    transactions,
    isLoading: false,
    refetch,
    create,
    update,
    remove,
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
});

function renderOverview(month = "2026-06", extra?: ReactNode) {
  return render(
    <CacheProvider>
      <ThemeProvider theme={theme}>
        <SnackbarProvider>
          <MemoryRouter initialEntries={[`/months/${month}`]}>
            <Routes>
              <Route
                path="/months/:month"
                element={<MonthOverview accounts={accounts} />}
              />
            </Routes>
            {extra}
          </MemoryRouter>
        </SnackbarProvider>
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

  it("records an edit through the month hook", () => {
    renderOverview();
    fireEvent.click(screen.getByText("Cat food"));
    fireEvent.click(screen.getByRole("button", { name: /save/i }));
    expect(update).toHaveBeenCalledWith("t1", CORRECTED);
  });

  it("records a delete through the month hook", () => {
    renderOverview();
    fireEvent.click(screen.getByText("Cat food"));
    fireEvent.click(screen.getByRole("button", { name: /delete/i }));
    expect(remove).toHaveBeenCalledWith("t1");
  });

  it("records a new expense through the month hook, on the active account", () => {
    renderOverview();
    fireEvent.click(screen.getByRole("button", { name: /add expense/i }));
    fireEvent.click(screen.getByRole("button", { name: /add transaction/i }));
    expect(create).toHaveBeenCalledWith("main", COFFEE);
  });
});

describe("MonthOverview — optimistic add", () => {
  beforeEach(async () => {
    const actual = await vi.importActual<
      typeof import("../useAllMonthTransactions")
    >("../useAllMonthTransactions");
    mockUseAllMonthTransactions.mockImplementation(
      actual.useAllMonthTransactions
    );

    // Every read answers empty; the create never lands, so the only thing that
    // can put a row on screen is the optimistic apply.
    vi.spyOn(globalThis, "fetch").mockImplementation(async (_input, init) => {
      const method = (init as RequestInit | undefined)?.method ?? "GET";
      if (method !== "GET") return new Promise<Response>(() => {});
      return { ok: true, json: async () => [] } as Response;
    });
  });

  it("paints the new expense in the spending list before the server responds", async () => {
    renderOverview();

    await waitFor(() => {
      expect(
        screen.getByText("No variable spending this month.")
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /add expense/i }));
    fireEvent.click(screen.getByRole("button", { name: /add transaction/i }));

    expect(screen.getByText("Coffee")).toBeInTheDocument();
  });

  it("closes the create modal as soon as the expense is recorded", async () => {
    renderOverview();

    await waitFor(() => {
      expect(
        screen.getByText("No variable spending this month.")
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /add expense/i }));
    fireEvent.click(screen.getByRole("button", { name: /add transaction/i }));

    expect(
      screen.queryByTestId("transaction-create-modal")
    ).not.toBeInTheDocument();
  });
});
