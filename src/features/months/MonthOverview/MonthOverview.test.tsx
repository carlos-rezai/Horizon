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
import { MemoryRouter, Routes, Route, Link } from "react-router-dom";
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
vi.mock("../useAllMonthTransactions/useAllMonthTransactions", () => ({
  useAllMonthTransactions: (...args: unknown[]) =>
    mockUseAllMonthTransactions(...args),
}));

const mockUseYearComparison = vi.fn();
vi.mock("../useYearComparison/useYearComparison", () => ({
  useYearComparison: (...args: unknown[]) => mockUseYearComparison(...args),
}));

const mockUseMonthCashFlow = vi.fn();
vi.mock("../useMonthCashFlow/useMonthCashFlow", () => ({
  useMonthCashFlow: (...args: unknown[]) => mockUseMonthCashFlow(...args),
}));

const mockUseProjection = vi.fn();
vi.mock("../../projection/useProjection/useProjection", () => ({
  useProjection: (...args: unknown[]) => mockUseProjection(...args),
}));

const mockUseHistoryPoints = vi.fn();
vi.mock("../../history/useHistoryPoints/useHistoryPoints", () => ({
  useHistoryPoints: (...args: unknown[]) => mockUseHistoryPoints(...args),
}));

const mockUseImportStartDates = vi.fn();
vi.mock("../useImportStartDates/useImportStartDates", () => ({
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
    anchorBalance: 0,
    anchorDate: "2026-01-01",
    balance: 0,
    color: "#7FA7D9",
  },
  {
    id: "visa",
    kind: "CreditCard",
    name: "Visa",
    anchorBalance: 0,
    anchorDate: "2026-01-01",
    balance: 0,
    color: "#C9897F",
  },
  {
    id: "mortgage",
    kind: "Mortgage",
    name: "Mortgage",
    anchorBalance: 0,
    anchorDate: "2026-01-01",
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

/** June's Fixed Flows: a salary on Main, nothing on Visa or the Mortgage. */
const cashFlowReport = {
  month: "2026-06",
  accounts: [
    {
      accountId: "main",
      flows: [
        {
          kind: "recurring",
          recurringId: "salary",
          date: "2026-06-25",
          description: "Salary",
          category: "Income",
          amount: 300000,
          inAnchor: false,
        },
      ],
    },
    { accountId: "visa", flows: [] },
    { accountId: "mortgage", flows: [] },
  ],
};

const LOADED_CASH_FLOW = {
  report: cashFlowReport,
  isLoading: false,
  error: null,
};

const PENDING_CASH_FLOW = {
  report: null,
  isLoading: true,
  error: null,
};

/** History through July 2026: Main known all along, Visa from July. */
const historyPoints = [
  {
    month: "2026-06",
    totalLiquid: 412300,
    restschuld: 21500000,
    netCashflow: 0,
    accounts: { main: 412300, visa: null, mortgage: 21500000 },
  },
  {
    month: "2026-07",
    totalLiquid: 430000,
    restschuld: 21400000,
    netCashflow: 0,
    accounts: { main: 420000, visa: 10000, mortgage: 21400000 },
  },
];

/** The projection from the current month, October 2026, through November. */
function projectionFrom(mainOctober: number) {
  return [
    {
      month: "2026-10",
      accounts: {
        main: { projected: mainOctober },
        visa: { projected: 0 },
        mortgage: { projected: 21100000 },
      },
      netCashflow: 0,
      totalLiquid: mainOctober,
    },
    {
      month: "2026-11",
      accounts: {
        main: { projected: 765400 },
        visa: { projected: 0 },
        mortgage: { projected: 21000000 },
      },
      netCashflow: 0,
      totalLiquid: 765400,
    },
  ];
}

const LOADED_PROJECTION = {
  snapshots: projectionFrom(100000),
  isLoading: false,
  error: null,
  refetch: vi.fn(),
};

const LOADED_HISTORY = {
  points: historyPoints,
  isLoading: false,
  error: null,
  refresh: vi.fn(),
};

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
  mockUseMonthCashFlow.mockReturnValue(LOADED_CASH_FLOW);
  mockUseProjection.mockReturnValue(LOADED_PROJECTION);
  mockUseHistoryPoints.mockReturnValue(LOADED_HISTORY);
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
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
      screen.getByText("Fixed flows · Variable spending · Month-end balances")
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
  "month-cash-flow-skeleton",
  "spending-list-skeleton",
  "month-breakdown-skeleton",
  "year-comparison-skeleton",
];

/** The ordered section wrappers the Month Overview renders in every state.
 *  The trailing `$` keeps each section's own fade wrapper (`…-fade`, issue
 *  #205) out of the count — the layout being asserted is the sections'. */
function sectionOrder(): string[] {
  return screen
    .getAllByTestId(/^month-section-[a-z-]+$/)
    .map((el) => el.getAttribute("data-testid") ?? "")
    .filter((id) => !id.endsWith("-fade"));
}

describe("MonthOverview — progressive reveal", () => {
  beforeEach(() => {
    mockUseAllMonthTransactions.mockReturnValue(PENDING_TRANSACTIONS);
    mockUseYearComparison.mockReturnValue({
      rows: [],
      isLoading: true,
      error: null,
    });
    mockUseMonthCashFlow.mockReturnValue(PENDING_CASH_FLOW);
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
    mockUseMonthCashFlow.mockReturnValue(LOADED_CASH_FLOW);
    renderOverview();

    const section = (name: string) =>
      within(screen.getByTestId(`month-section-${name}`));

    expect(
      section("stats").getByTestId("month-stat-strip")
    ).toBeInTheDocument();
    expect(section("spending").getByText("Cat food")).toBeInTheDocument();
    expect(section("breakdown").getByText("By category")).toBeInTheDocument();
    expect(section("comparison").getByTestId("yc-row")).toBeInTheDocument();
    expect(section("cash-flow").getByText("Salary")).toBeInTheDocument();
    expect(screen.queryAllByTestId(/skeleton/)).toHaveLength(0);
  });

  it("keeps the section layout identical before and after the data lands", () => {
    const { rerender } = renderOverview("2026-06", { accountsLoading: true });

    const whileLoading = sectionOrder();
    expect(whileLoading).toHaveLength(5);

    mockUseAllMonthTransactions.mockReturnValue(LOADED_TRANSACTIONS);
    mockUseYearComparison.mockReturnValue(LOADED_COMPARISON);
    mockUseMonthCashFlow.mockReturnValue(LOADED_CASH_FLOW);
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
      typeof import("../useAllMonthTransactions/useAllMonthTransactions")
    >("../useAllMonthTransactions/useAllMonthTransactions");
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
      typeof import("../useAllMonthTransactions/useAllMonthTransactions")
    >("../useAllMonthTransactions/useAllMonthTransactions");
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

// ─────────────────────────────────────────────────────────────
// Issue #205 — Transitions
// Switching months cross-fades rather than hard-cutting. `Link` is used to
// drive the route because it navigates through the router's own navigator,
// so it is unaffected by this file's `useNavigate` mock.
// ─────────────────────────────────────────────────────────────

describe("MonthOverview — month cross-fade", () => {
  it("holds the month's content in a single fade wrapper", () => {
    renderOverview();

    expect(screen.getByTestId("month-content-fade")).toBeInTheDocument();
  });

  it("cross-fades the content when the month changes", async () => {
    renderOverview("2026-06", {
      extra: <Link to="/months/2026-07">Go to July</Link>,
    });
    const inJune = screen.getByTestId("month-content-fade");

    fireEvent.click(screen.getByRole("link", { name: "Go to July" }));

    await waitFor(() => {
      expect(
        screen.getByText("July 2026", { selector: "div" })
      ).toBeInTheDocument();
    });

    // A fresh wrapper is what replays the fade — July's numbers do not hard-cut
    // into the element June's were occupying.
    expect(screen.getByTestId("month-content-fade")).not.toBe(inJune);
  });

  it("suppresses the cross-fade when reduced motion is preferred", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));

    renderOverview();

    expect(screen.getByTestId("month-content-fade")).toHaveAttribute(
      "data-motion",
      "none"
    );
  });
});

describe("MonthOverview — Fixed Flows card", () => {
  it("reads the viewed month's cash flow report", () => {
    renderOverview("2026-09");

    expect(mockUseMonthCashFlow).toHaveBeenCalledWith("2026-09");
  });

  it("renders the card in its own section, between the stat strip and the columns", () => {
    renderOverview();

    expect(sectionOrder()).toEqual([
      "month-section-stats",
      "month-section-cash-flow",
      "month-section-spending",
      "month-section-breakdown",
      "month-section-comparison",
    ]);
  });

  it("lists the month's recurring flows per account", () => {
    renderOverview();

    const card = within(screen.getByTestId("month-section-cash-flow"));
    expect(card.getByText("Fixed Flows")).toBeInTheDocument();
    expect(card.getByText("Salary")).toBeInTheDocument();
    expect(card.getAllByTestId("fixed-flow-group")).toHaveLength(3);
  });

  it("includes the accounts Variable Spending leaves out, such as the Mortgage", () => {
    renderOverview();

    expect(
      within(screen.getByTestId("month-section-cash-flow")).getByText(
        "Mortgage"
      )
    ).toBeInTheDocument();
  });

  it("shows its layout-matched skeleton while the report loads, without holding back the other sections", () => {
    mockUseMonthCashFlow.mockReturnValue(PENDING_CASH_FLOW);
    renderOverview();

    const section = within(screen.getByTestId("month-section-cash-flow"));
    expect(section.getByTestId("month-cash-flow-skeleton")).toBeInTheDocument();
    expect(section.getAllByTestId("skeleton").length).toBeGreaterThan(0);
    expect(
      within(screen.getByTestId("month-section-spending")).getByText("Cat food")
    ).toBeInTheDocument();
  });

  it("shows its skeleton while the accounts load", () => {
    renderOverview("2026-06", { accountsLoading: true });

    expect(
      within(screen.getByTestId("month-section-cash-flow")).getByTestId(
        "month-cash-flow-skeleton"
      )
    ).toBeInTheDocument();
  });

  it("shows a failed report as the section's error state without blanking the page", () => {
    mockUseMonthCashFlow.mockReturnValue({
      report: null,
      isLoading: false,
      error: "Report unavailable",
    });
    renderOverview();

    expect(
      within(screen.getByTestId("month-section-cash-flow")).getByText(
        /Report unavailable/
      )
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Month Overview" })
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId("month-section-spending")).getByText("Cat food")
    ).toBeInTheDocument();
    expect(screen.getByTestId("month-stat-strip")).toBeInTheDocument();
  });

  it("cross-fades with the month's content, so reduced motion holds for it too", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query === "(prefers-reduced-motion: reduce)",
      media: query,
      addEventListener: () => {},
      removeEventListener: () => {},
    }));

    renderOverview();

    const fade = screen.getByTestId("month-content-fade");
    expect(fade).toHaveAttribute("data-motion", "none");
    expect(
      within(fade).getByTestId("month-section-cash-flow")
    ).toBeInTheDocument();
  });
});

// ─────────────────────────────────────────────────────────────
// Issue #250 — Month-End Balance in the group headers
// Today is October 2026: an earlier month reads History, the current and a
// later month read the projection.
// ─────────────────────────────────────────────────────────────

/** A Fixed Flows group's header, found by the account name in it. */
function cashFlowHeadFor(name: string): HTMLElement {
  const head = within(screen.getByTestId("month-section-cash-flow"))
    .getAllByTestId("fixed-flow-group-head")
    .find((h) => within(h).getByRole("heading").textContent === name);
  if (!head) throw new Error(`no group headed ${name}`);
  return head;
}

describe("MonthOverview — Month-End Balance", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-16T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("heads a past month's groups with the Actual balance from History", () => {
    renderOverview("2026-06");

    const main = within(cashFlowHeadFor("Main"));
    expect(main.getByText("4.123,00 €")).toBeInTheDocument();
    expect(main.getByText("Month-end · Actual")).toBeInTheDocument();
  });

  it("heads the current month's groups with the Projected balance", () => {
    renderOverview("2026-10");

    const main = within(cashFlowHeadFor("Main"));
    expect(main.getByText("1.000,00 €")).toBeInTheDocument();
    expect(main.getByText("Month-end · Projected")).toBeInTheDocument();
  });

  it("heads a future month's groups with the Projected balance", () => {
    renderOverview("2026-11");

    const main = within(cashFlowHeadFor("Main"));
    expect(main.getByText("7.654,00 €")).toBeInTheDocument();
    expect(main.getByText("Month-end · Projected")).toBeInTheDocument();
  });

  it("reads an account History does not know yet as 'No data before …', never €0", () => {
    renderOverview("2026-06");

    const visa = cashFlowHeadFor("Visa");
    expect(
      within(visa).getByText("No data before Jul 2026")
    ).toBeInTheDocument();
    expect(visa).not.toHaveTextContent("0,00 €");
  });

  it("reads a month past the projection horizon as Unknown, never €0", () => {
    renderOverview("2027-02");

    const main = cashFlowHeadFor("Main");
    expect(main).toHaveTextContent(/No data before/);
    expect(main).not.toHaveTextContent("0,00 €");
    expect(main).not.toHaveTextContent("Month-end · ");
  });

  it("holds the card on its skeleton while the projection loads", () => {
    mockUseProjection.mockReturnValue({
      ...LOADED_PROJECTION,
      snapshots: [],
      isLoading: true,
    });
    renderOverview("2026-10");

    expect(
      within(screen.getByTestId("month-section-cash-flow")).getByTestId(
        "month-cash-flow-skeleton"
      )
    ).toBeInTheDocument();
    expect(
      within(screen.getByTestId("month-section-spending")).getByText("Cat food")
    ).toBeInTheDocument();
  });

  it("holds the card on its skeleton while History loads", () => {
    mockUseHistoryPoints.mockReturnValue({
      ...LOADED_HISTORY,
      points: [],
      isLoading: true,
    });
    renderOverview("2026-06");

    expect(
      within(screen.getByTestId("month-section-cash-flow")).getByTestId(
        "month-cash-flow-skeleton"
      )
    ).toBeInTheDocument();
  });
});

describe("MonthOverview — Month-End Balance after an expense", () => {
  let posted = false;

  beforeEach(async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-10-16T12:00:00Z"));
    posted = false;

    // The real month, projection and History hooks, so the expense's commit
    // goes through the shared cache exactly as it does in the app.
    const months = await vi.importActual<
      typeof import("../useAllMonthTransactions/useAllMonthTransactions")
    >("../useAllMonthTransactions/useAllMonthTransactions");
    mockUseAllMonthTransactions.mockImplementation(
      months.useAllMonthTransactions
    );
    const projection = await vi.importActual<
      typeof import("../../projection/useProjection/useProjection")
    >("../../projection/useProjection/useProjection");
    mockUseProjection.mockImplementation(projection.useProjection);
    const history = await vi.importActual<
      typeof import("../../history/useHistoryPoints/useHistoryPoints")
    >("../../history/useHistoryPoints/useHistoryPoints");
    mockUseHistoryPoints.mockImplementation(history.useHistoryPoints);

    // The server projects Main at 1,000.00 until the expense lands, and at
    // 995.50 after it.
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      const method = (init as RequestInit | undefined)?.method ?? "GET";
      if (method === "POST") {
        posted = true;
        return {
          ok: true,
          json: async () => ({ id: "t-new", accountId: "main", ...COFFEE }),
        } as Response;
      }
      if (url.includes("/projection/history")) {
        return { ok: true, json: async () => historyPoints } as Response;
      }
      if (url.includes("/projection")) {
        return {
          ok: true,
          json: async () => projectionFrom(posted ? 99550 : 100000),
        } as Response;
      }
      return { ok: true, json: async () => [] } as Response;
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("updates the Month-End Balance without a reload", async () => {
    renderOverview("2026-10");

    await waitFor(() => {
      expect(
        within(cashFlowHeadFor("Main")).getByText("1.000,00 €")
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /add expense/i }));
    fireEvent.click(screen.getByRole("button", { name: /add transaction/i }));

    await waitFor(() => {
      expect(
        within(cashFlowHeadFor("Main")).getByText("995,50 €")
      ).toBeInTheDocument();
    });
    expect(
      within(cashFlowHeadFor("Main")).getByText("Month-end · Projected")
    ).toBeInTheDocument();
  });
});
