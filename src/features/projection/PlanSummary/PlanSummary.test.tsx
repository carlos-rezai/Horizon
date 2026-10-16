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
  anchorBalance: 0,
  anchorDate: "2026-01-01",
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
  it("renders 'ST' as the Sondertilgung column header", () => {
    renderSummary();

    expect(screen.getByText("ST")).toBeInTheDocument();
  });

  it("renders the section overline and title", () => {
    renderSummary();

    expect(screen.getByText("Outlook")).toBeInTheDocument();
    expect(screen.getByText("Plan Summary")).toBeInTheDocument();
  });

  it("navigates to the full plan when the Full plan action is clicked", () => {
    renderSummary();

    fireEvent.click(screen.getByRole("button", { name: /Full plan/i }));

    expect(mockNavigate).toHaveBeenCalledWith("/plan");
  });
});

describe("PlanSummary — payoff year", () => {
  const mortgageAccount: AccountWithBalance = {
    id: "m1",
    kind: "Mortgage",
    name: "Home Loan",
    anchorBalance: -20000000,
    anchorDate: "2026-01-01",
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

  it("renders a Payoff flag in the Restschuld column where restschuld reaches zero", () => {
    renderSummary(payoffSnapshots, [giroAccount, mortgageAccount]);

    expect(screen.getByText("Payoff")).toBeInTheDocument();
  });

  it("renders the Payoff flag only on rows where restschuld is zero", () => {
    renderSummary(payoffSnapshots, [giroAccount, mortgageAccount]);

    expect(screen.getAllByText("Payoff")).toHaveLength(1);
  });
});

describe("PlanSummary — Sondertilgung column", () => {
  const mortgage: AccountWithBalance = {
    id: "m1",
    kind: "Mortgage",
    name: "Home Loan",
    anchorBalance: 2500000,
    anchorDate: "2026-01-01",
    balance: 2500000,
  };

  function transfer(
    id: string,
    amount: number,
    frequency: RecurringTransaction["frequency"],
    monthOfYear?: number
  ): RecurringTransaction {
    return {
      id,
      accountId: "g1",
      amount,
      description: id,
      category: "Housing",
      frequency,
      dayOfMonth: 1,
      linkedAccountId: "m1",
      monthOfYear,
    };
  }

  // Monthly snapshots from October 2026 to December 2028: €25,000 Restschuld
  // falling €100 every month and €20,000 more each November. November 2027 is
  // the Payoff Month, with only €3,800 left the month before.
  const snapshots: MonthlySnapshot[] = [];
  let restschuld = 2500000;
  for (let i = 0; i < 27; i++) {
    const year = 2026 + Math.floor((9 + i) / 12);
    const monthNum = ((9 + i) % 12) + 1;
    if (i > 0) {
      restschuld -= 10000;
      if (monthNum === 11) restschuld -= 2000000;
      restschuld = Math.max(0, restschuld);
    }
    snapshots.push({
      month: `${year}-${String(monthNum).padStart(2, "0")}`,
      accounts: { m1: { projected: restschuld }, g1: { projected: 100000 } },
      netCashflow: 0,
      totalLiquid: 100000,
    });
  }

  const recurring = [
    transfer("Darlehen", 10000, "monthly"),
    transfer("Sondertilgung", 2000000, "annual", 11),
  ];

  function renderWithRecurring() {
    return render(
      <MemoryRouter>
        <ThemeProvider theme={theme}>
          <PlanSummary
            snapshots={snapshots}
            accounts={[giroAccount, mortgage]}
            recurringTransactions={recurring}
          />
        </ThemeProvider>
      </MemoryRouter>
    );
  }

  function stCell(row: HTMLElement): HTMLElement {
    const cells = row.querySelectorAll("td");
    return cells[cells.length - 1] as HTMLElement;
  }

  it("caps the payoff year's Sondertilgung at the Restschuld that was left", () => {
    renderWithRecurring();
    const rows = screen.getAllByTestId("year-summary-row");

    expect(stCell(rows[1])).toHaveTextContent(/-3\.800,00/);
  });

  it("reports no Sondertilgung for a year after payoff", () => {
    renderWithRecurring();
    const rows = screen.getAllByTestId("year-summary-row");

    expect(rows[2]).toHaveTextContent("2028");
    expect(stCell(rows[2])).toHaveTextContent("—");
  });
});
