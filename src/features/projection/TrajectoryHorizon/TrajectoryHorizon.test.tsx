// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../tokens";
import TrajectoryHorizon from "./TrajectoryHorizon";
import type { MonthlySnapshot } from "../../../types/projection";
import type { AccountWithBalance } from "../../../types/account";
import type { RecurringTransaction } from "../../../types/recurring";

afterEach(() => {
  cleanup();
});

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

const giroAccount: AccountWithBalance = {
  id: "g1",
  kind: "Girokonto",
  name: "Main",
  openingBalance: 0,
  openingDate: "2026-01-01",
  balance: 0,
};

const snapshots: MonthlySnapshot[] = [
  {
    month: "2026-04",
    accounts: { g1: { projected: 100000 } },
    netCashflow: 5000,
    totalLiquid: 100000,
  },
  {
    month: "2026-05",
    accounts: { g1: { projected: 105000 } },
    netCashflow: 5000,
    totalLiquid: 105000,
  },
];

const mortgageAccount: AccountWithBalance = {
  id: "m1",
  kind: "Mortgage",
  name: "DSL Mortgage",
  openingBalance: 0,
  openingDate: "2026-01-01",
  balance: 0,
};

// Mortgage reaches zero at 2026-05
const snapshotsWithPayoff: MonthlySnapshot[] = [
  {
    month: "2026-04",
    accounts: { g1: { projected: 100000 }, m1: { projected: 50000 } },
    netCashflow: 5000,
    totalLiquid: 100000,
  },
  {
    month: "2026-05",
    accounts: { g1: { projected: 105000 }, m1: { projected: 0 } },
    netCashflow: 5000,
    totalLiquid: 105000,
  },
  {
    month: "2026-06",
    accounts: { g1: { projected: 110000 }, m1: { projected: 0 } },
    netCashflow: 5000,
    totalLiquid: 110000,
  },
];

// Mortgage never reaches zero
const snapshotsNoPayoff: MonthlySnapshot[] = [
  {
    month: "2026-04",
    accounts: { g1: { projected: 100000 }, m1: { projected: 50000 } },
    netCashflow: 5000,
    totalLiquid: 100000,
  },
  {
    month: "2026-05",
    accounts: { g1: { projected: 105000 }, m1: { projected: 30000 } },
    netCashflow: 5000,
    totalLiquid: 105000,
  },
];

const noRecurring: RecurringTransaction[] = [];

describe("TrajectoryHorizon", () => {
  it("renders the heading 'Trajectory Horizon'", () => {
    renderWithTheme(
      <TrajectoryHorizon
        snapshots={snapshots}
        accounts={[giroAccount]}
        recurringTransactions={noRecurring}
        isLoading={false}
      />
    );

    expect(
      screen.getByRole("heading", { name: /trajectory horizon/i })
    ).toBeInTheDocument();
  });

  it("renders a loading indicator when isLoading is true", () => {
    renderWithTheme(
      <TrajectoryHorizon
        snapshots={[]}
        accounts={[]}
        recurringTransactions={noRecurring}
        isLoading={true}
      />
    );

    expect(
      screen.getByTestId("trajectory-horizon-loading")
    ).toBeInTheDocument();
  });

  it("does not render the chart container when isLoading is true", () => {
    renderWithTheme(
      <TrajectoryHorizon
        snapshots={[]}
        accounts={[]}
        recurringTransactions={noRecurring}
        isLoading={true}
      />
    );

    expect(
      screen.queryByTestId("trajectory-horizon-chart")
    ).not.toBeInTheDocument();
  });

  it("renders an empty-state guidance message when accounts array is empty", () => {
    renderWithTheme(
      <TrajectoryHorizon
        snapshots={[]}
        accounts={[]}
        recurringTransactions={noRecurring}
        isLoading={false}
      />
    );

    expect(screen.getByTestId("trajectory-horizon-empty")).toBeInTheDocument();
  });

  it("does not render chart container when in empty state", () => {
    renderWithTheme(
      <TrajectoryHorizon
        snapshots={[]}
        accounts={[]}
        recurringTransactions={noRecurring}
        isLoading={false}
      />
    );

    expect(
      screen.queryByTestId("trajectory-horizon-chart")
    ).not.toBeInTheDocument();
  });

  it("renders the payoff marker when a mortgage is paid off within the snapshot window", () => {
    renderWithTheme(
      <TrajectoryHorizon
        snapshots={snapshotsWithPayoff}
        accounts={[giroAccount, mortgageAccount]}
        recurringTransactions={noRecurring}
        isLoading={false}
      />
    );

    expect(screen.getByTestId("payoff-marker")).toBeInTheDocument();
  });

  it("does not render the payoff marker when no mortgage account is provided", () => {
    renderWithTheme(
      <TrajectoryHorizon
        snapshots={snapshotsWithPayoff}
        accounts={[giroAccount]}
        recurringTransactions={noRecurring}
        isLoading={false}
      />
    );

    expect(screen.queryByTestId("payoff-marker")).not.toBeInTheDocument();
  });

  it("does not render the payoff marker when the mortgage is not paid off within the snapshot window", () => {
    renderWithTheme(
      <TrajectoryHorizon
        snapshots={snapshotsNoPayoff}
        accounts={[giroAccount, mortgageAccount]}
        recurringTransactions={noRecurring}
        isLoading={false}
      />
    );

    expect(screen.queryByTestId("payoff-marker")).not.toBeInTheDocument();
  });

  it("renders the chart container when snapshots and accounts are present", () => {
    renderWithTheme(
      <TrajectoryHorizon
        snapshots={snapshots}
        accounts={[giroAccount]}
        recurringTransactions={noRecurring}
        isLoading={false}
      />
    );

    expect(screen.getByTestId("trajectory-horizon-chart")).toBeInTheDocument();
  });
});
