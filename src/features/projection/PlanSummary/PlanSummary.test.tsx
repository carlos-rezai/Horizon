// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { ThemeProvider } from "styled-components";
import { MemoryRouter } from "react-router-dom";
import { theme } from "../../../tokens";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mockNavigate };
});
import PlanSummary from "./PlanSummary";
import type { MonthlySnapshot } from "../../../types/projection";
import type { AccountWithBalance } from "../../../types/account";
import type { RecurringTransaction } from "../../../types/recurring";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const giroAccount: AccountWithBalance = {
  id: "g1",
  kind: "Girokonto",
  name: "Main",
  openingBalance: 0,
  openingDate: "2026-01-01",
  balance: 0,
};

const twoYearSnapshots: MonthlySnapshot[] = [
  {
    month: "2026-12",
    accounts: { g1: { projected: 100000 } },
    netCashflow: 5000,
    totalLiquid: 100000,
  },
  {
    month: "2027-12",
    accounts: { g1: { projected: 200000 } },
    netCashflow: 5000,
    totalLiquid: 200000,
  },
];

const noRecurring: RecurringTransaction[] = [];

function renderSummary(
  snapshots: MonthlySnapshot[] = twoYearSnapshots,
  accounts: AccountWithBalance[] = [giroAccount],
  maxYears?: number
) {
  return render(
    <MemoryRouter>
      <ThemeProvider theme={theme}>
        <PlanSummary
          snapshots={snapshots}
          accounts={accounts}
          recurringTransactions={noRecurring}
          maxYears={maxYears}
        />
      </ThemeProvider>
    </MemoryRouter>
  );
}

describe("PlanSummary — year rows", () => {
  it("renders one year-summary-row per projected year", () => {
    renderSummary();

    expect(screen.getAllByTestId("year-summary-row")).toHaveLength(2);
  });

  it("renders the year number in each row", () => {
    renderSummary();

    const rows = screen.getAllByTestId("year-summary-row");
    expect(rows[0]).toHaveTextContent("2026");
    expect(rows[1]).toHaveTextContent("2027");
  });

  it("renders the Total Liquid amount in each row", () => {
    renderSummary();

    const rows = screen.getAllByTestId("year-summary-row");
    expect(rows[0]).toHaveTextContent(/1[.,]000/);
  });

  it("respects maxYears — truncates rows to the requested count", () => {
    renderSummary(twoYearSnapshots, [giroAccount], 1);

    expect(screen.getAllByTestId("year-summary-row")).toHaveLength(1);
  });
});

describe("PlanSummary — row click navigation", () => {
  it("clicking a year row navigates to the plan page for that year", () => {
    renderSummary();

    fireEvent.click(screen.getAllByTestId("year-summary-row")[0]);

    expect(mockNavigate).toHaveBeenCalledWith("/plan#2026", {
      state: { year: 2026 },
    });
  });

  it("carries the clicked row's own year into the Outlook deep-link state", () => {
    renderSummary();

    fireEvent.click(screen.getAllByTestId("year-summary-row")[1]);

    expect(mockNavigate).toHaveBeenCalledWith("/plan#2027", {
      state: { year: 2027 },
    });
  });
});

describe("PlanSummary — column headers", () => {
  it("renders 'Savings Rate' as the ST column header", () => {
    renderSummary();

    expect(screen.getByText("Savings Rate")).toBeInTheDocument();
  });
});

describe("PlanSummary — payoff year", () => {
  const mortgageAccount: AccountWithBalance = {
    id: "m1",
    kind: "Mortgage",
    name: "Home Loan",
    openingBalance: -20000000,
    openingDate: "2026-01-01",
    balance: -20000000,
  };

  const payoffSnapshots: MonthlySnapshot[] = [
    {
      month: "2026-12",
      accounts: { m1: { projected: -5000000 }, g1: { projected: 100000 } },
      netCashflow: 5000,
      totalLiquid: 100000,
    },
    {
      month: "2027-12",
      accounts: { m1: { projected: 0 }, g1: { projected: 200000 } },
      netCashflow: 5000,
      totalLiquid: 200000,
    },
  ];

  it("renders a PAYOFF badge on the first row where restschuld reaches zero", () => {
    renderSummary(payoffSnapshots, [giroAccount, mortgageAccount]);

    expect(screen.getByText("PAYOFF")).toBeInTheDocument();
  });

  it("renders the PAYOFF badge only on the payoff year row", () => {
    renderSummary(payoffSnapshots, [giroAccount, mortgageAccount]);

    expect(screen.getAllByText("PAYOFF")).toHaveLength(1);
  });
});
