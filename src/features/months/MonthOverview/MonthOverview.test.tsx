// @vitest-environment jsdom
import { type ReactNode } from "react";
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
  within,
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

interface OverviewOptions {
  /** Accounts are fetched a level up, so their pending state arrives as a prop. */
  accountsLoading?: boolean;
  accountsError?: string | null;
  /** Swapped off and back on to stand in for navigating away and returning. */
  mounted?: boolean;
  extra?: ReactNode;
}

function overviewTree(month: string, options: OverviewOptions = {}) {
  const {
    accountsLoading = false,
    accountsError = null,
    mounted = true,
    extra,
  } = options;

  return (
    <CacheProvider>
      <ThemeProvider theme={theme}>
        <SnackbarProvider>
          <MemoryRouter initialEntries={[`/months/${month}`]}>
            <Routes>
              <Route
                path="/months/:month"
                element={
                  mounted ? (
                    <MonthOverview
                      accounts={accountsLoading ? [] : accounts}
                      accountsLoading={accountsLoading}
                      accountsError={accountsError}
                    />
                  ) : (
                    <div data-testid="elsewhere" />
                  )
                }
              />
            </Routes>
            {extra}
          </MemoryRouter>
        </SnackbarProvider>
      </ThemeProvider>
    </CacheProvider>
  );
}

function renderOverview(month = "2026-06", options: OverviewOptions = {}) {
  return render(overviewTree(month, options));
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

// --- Progressive reveal ------------------------------------------------------
//
// A cold month used to resolve straight to "No variable spending this month.":
// with no accounts yet there are no ids to fetch, so the empty state stood in
// for the loading one. Each section now owns its own loading, error and empty
// state, driven only by the resources it draws from.

const PENDING_TRANSACTIONS = {
  transactions: [],
  isLoading: true,
  error: null,
  refetch,
  create,
  update,
  remove,
};

const LOADED_TRANSACTIONS = {
  transactions,
  isLoading: false,
  error: null,
  refetch,
  create,
  update,
  remove,
};

const LOADED_COMPARISON = {
  rows: [{ category: "Groceries", thisYear: 12000, lastYear: 9000 }],
  isLoading: false,
  error: null,
};

const SECTION_SKELETONS = [
  "month-stat-strip-skeleton",
  "spending-list-skeleton",
  "month-breakdown-skeleton",
  "year-comparison-skeleton",
];

/** The ordered section wrappers the Month Overview renders in every state. */
function sectionOrder(): string[] {
  return screen
    .getAllByTestId(/^month-section-/)
    .map((el) => el.getAttribute("data-testid") ?? "");
}

describe("MonthOverview — progressive reveal", () => {
  beforeEach(() => {
    mockUseAllMonthTransactions.mockReturnValue(PENDING_TRANSACTIONS);
    mockUseYearComparison.mockReturnValue({
      rows: [],
      isLoading: true,
      error: null,
    });
  });

  it("renders the page frame and every section skeleton on the first load of a month", () => {
    renderOverview("2026-06", { accountsLoading: true });

    expect(
      screen.getByRole("heading", { name: "Month Overview" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /previous month/i })
    ).toBeInTheDocument();
    for (const skeleton of SECTION_SKELETONS) {
      expect(screen.getByTestId(skeleton)).toBeInTheDocument();
    }
    expect(screen.queryByLabelText("Loading")).not.toBeInTheDocument();
  });

  it("builds every section skeleton from the shared Skeleton primitive", () => {
    renderOverview("2026-06", { accountsLoading: true });

    for (const skeleton of SECTION_SKELETONS) {
      expect(
        within(screen.getByTestId(skeleton)).getAllByTestId("skeleton").length
      ).toBeGreaterThan(0);
    }
  });

  it("does not mistake a still-loading month for an empty one", () => {
    renderOverview("2026-06", { accountsLoading: true });

    expect(
      screen.queryByText("No variable spending this month.")
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText("No spending to break down this month.")
    ).not.toBeInTheDocument();
  });

  it("reveals the year comparison as soon as it resolves, while the spending list is still a skeleton", () => {
    mockUseYearComparison.mockReturnValue(LOADED_COMPARISON);
    renderOverview("2026-06", { accountsLoading: true });

    expect(
      within(screen.getByTestId("month-section-comparison")).getByTestId(
        "yc-row"
      )
    ).toBeInTheDocument();
    expect(screen.getByTestId("spending-list-skeleton")).toBeInTheDocument();
  });

  it("swaps every section to its content once the month's data lands", () => {
    mockUseAllMonthTransactions.mockReturnValue(LOADED_TRANSACTIONS);
    mockUseYearComparison.mockReturnValue(LOADED_COMPARISON);
    renderOverview();

    const section = (name: string) =>
      within(screen.getByTestId(`month-section-${name}`));

    expect(
      section("stats").getByTestId("month-stat-strip")
    ).toBeInTheDocument();
    expect(section("spending").getByText("Cat food")).toBeInTheDocument();
    expect(section("breakdown").getByText("By category")).toBeInTheDocument();
    expect(section("comparison").getByTestId("yc-row")).toBeInTheDocument();
    expect(screen.queryAllByTestId(/skeleton/)).toHaveLength(0);
  });

  it("keeps the section layout identical before and after the data lands", () => {
    const { rerender } = renderOverview("2026-06", { accountsLoading: true });

    const whileLoading = sectionOrder();
    expect(whileLoading).toHaveLength(4);

    mockUseAllMonthTransactions.mockReturnValue(LOADED_TRANSACTIONS);
    mockUseYearComparison.mockReturnValue(LOADED_COMPARISON);
    rerender(overviewTree("2026-06"));

    expect(sectionOrder()).toEqual(whileLoading);
  });
});

describe("MonthOverview — section states", () => {
  it("shows a section error that reads differently from both loading and empty", () => {
    mockUseAllMonthTransactions.mockReturnValue({
      ...PENDING_TRANSACTIONS,
      isLoading: false,
      error: "Network error",
    });
    renderOverview();

    expect(
      within(screen.getByTestId("month-section-spending")).getByText(
        /Network error/
      )
    ).toBeInTheDocument();
    expect(screen.queryAllByTestId(/skeleton/)).toHaveLength(0);
    expect(
      screen.queryByText("No variable spending this month.")
    ).not.toBeInTheDocument();
  });

  it("errors the month's sections when accounts fail to load", () => {
    mockUseAllMonthTransactions.mockReturnValue(PENDING_TRANSACTIONS);
    renderOverview("2026-06", {
      accountsLoading: false,
      accountsError: "Accounts unavailable",
    });

    expect(
      within(screen.getByTestId("month-section-spending")).getByText(
        /Accounts unavailable/
      )
    ).toBeInTheDocument();
  });

  it("shows the existing empty states rather than skeletons for a genuinely empty month", () => {
    mockUseAllMonthTransactions.mockReturnValue({
      ...PENDING_TRANSACTIONS,
      isLoading: false,
    });
    mockUseYearComparison.mockReturnValue({
      rows: [],
      isLoading: false,
      error: null,
    });
    renderOverview();

    const section = (name: string) =>
      within(screen.getByTestId(`month-section-${name}`));

    expect(
      section("spending").getByText("No variable spending this month.")
    ).toBeInTheDocument();
    expect(
      section("breakdown").getByText("No spending to break down this month.")
    ).toBeInTheDocument();
    expect(
      section("comparison").getByText("No spending yet this year.")
    ).toBeInTheDocument();
    expect(screen.queryAllByTestId(/skeleton/)).toHaveLength(0);
  });
});

describe("MonthOverview — first load of a month", () => {
  beforeEach(async () => {
    const actual = await vi.importActual<
      typeof import("../useAllMonthTransactions")
    >("../useAllMonthTransactions");
    mockUseAllMonthTransactions.mockImplementation(
      actual.useAllMonthTransactions
    );
  });

  it("surfaces a failed month read as a section error", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));
    renderOverview();

    await waitFor(() => {
      expect(
        within(screen.getByTestId("month-section-spending")).getByText(
          /Network error/
        )
      ).toBeInTheDocument();
    });
  });

  it("paints a month already in the cache without a skeleton frame", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(
      async () => ({ ok: true, json: async () => [] }) as Response
    );

    const { rerender } = render(overviewTree("2026-06"));

    // Nothing cached for this month yet, so the first visit is a real cold load.
    expect(screen.getByTestId("spending-list-skeleton")).toBeInTheDocument();

    await waitFor(() => {
      expect(
        screen.getByText("No variable spending this month.")
      ).toBeInTheDocument();
    });

    // Leave the month and come back. The cache still holds it, so the return
    // visit is not a first load and must skip the skeletons entirely.
    rerender(overviewTree("2026-06", { mounted: false }));
    rerender(overviewTree("2026-06"));

    expect(screen.queryAllByTestId(/skeleton/)).toHaveLength(0);
    expect(
      screen.getByText("No variable spending this month.")
    ).toBeInTheDocument();
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
