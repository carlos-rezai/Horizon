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
  _id: "g1",
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

    expect(screen.getByTestId("trajectory-horizon-loading")).toBeInTheDocument();
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

  it("renders the chart container when snapshots and accounts are present", () => {
    renderWithTheme(
      <TrajectoryHorizon
        snapshots={snapshots}
        accounts={[giroAccount]}
        recurringTransactions={noRecurring}
        isLoading={false}
      />
    );

    expect(
      screen.getByTestId("trajectory-horizon-chart")
    ).toBeInTheDocument();
  });
});
