// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../tokens";
import TrajectoryHorizon from "./TrajectoryHorizon";
import type { MonthlySnapshot } from "../../../types/projection";
import type { AccountWithBalance } from "../../../types/account";
import type { RecurringTransaction } from "../../../types/recurring";

// The chart itself cannot lay out in jsdom, so the recharts boundary is
// stubbed: ResponsiveContainer passes its children through and ComposedChart
// records the data points it was handed, which carry the ST marks.
const chart = vi.hoisted(() => ({
  data: [] as { label: string; isSTMonth: boolean }[],
}));
vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
    ComposedChart: ({
      data,
    }: {
      data: { label: string; isSTMonth: boolean }[];
    }) => {
      chart.data = data;
      return null;
    },
  };
});

afterEach(() => {
  cleanup();
  chart.data = [];
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
  color: null,
};

const giroAccountWithColor: AccountWithBalance = {
  id: "g1",
  kind: "Girokonto",
  name: "Main",
  openingBalance: 0,
  openingDate: "2026-01-01",
  balance: 0,
  color: "#FF6600",
};

const giroAccount2WithColor: AccountWithBalance = {
  id: "g2",
  kind: "Girokonto",
  name: "Secondary",
  openingBalance: 0,
  openingDate: "2026-01-01",
  balance: 0,
  color: "#0088FF",
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

const snapshotsTwoGiro: MonthlySnapshot[] = [
  {
    month: "2026-04",
    accounts: { g1: { projected: 100000 }, g2: { projected: 50000 } },
    netCashflow: 5000,
    totalLiquid: 150000,
  },
  {
    month: "2026-05",
    accounts: { g1: { projected: 105000 }, g2: { projected: 55000 } },
    netCashflow: 5000,
    totalLiquid: 160000,
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

  describe("chart kind color mapping", () => {
    it("renders a chart-line marker for each non-mortgage account, keyed by account id", () => {
      renderWithTheme(
        <TrajectoryHorizon
          snapshots={snapshots}
          accounts={[giroAccount]}
          recurringTransactions={noRecurring}
          isLoading={false}
        />
      );

      expect(screen.getByTestId("chart-line-g1")).toBeInTheDocument();
    });

    it("Girokonto chart line marker with null color carries the chartColors.Girokonto fallback color", () => {
      renderWithTheme(
        <TrajectoryHorizon
          snapshots={snapshots}
          accounts={[giroAccount]}
          recurringTransactions={noRecurring}
          isLoading={false}
        />
      );

      expect(screen.getByTestId("chart-line-g1")).toHaveAttribute(
        "data-color",
        theme.colors.chartColors.Girokonto
      );
    });

    it("does not render chart-line markers when in loading state", () => {
      renderWithTheme(
        <TrajectoryHorizon
          snapshots={[]}
          accounts={[giroAccount]}
          recurringTransactions={noRecurring}
          isLoading={true}
        />
      );

      expect(screen.queryByTestId("chart-line-g1")).not.toBeInTheDocument();
    });
  });

  describe("account color identity", () => {
    it("hidden color-marker testid is chart-line-{account.id}, not chart-line-{kind}", () => {
      renderWithTheme(
        <TrajectoryHorizon
          snapshots={snapshots}
          accounts={[giroAccountWithColor]}
          recurringTransactions={noRecurring}
          isLoading={false}
        />
      );

      expect(screen.getByTestId("chart-line-g1")).toBeInTheDocument();
      expect(
        screen.queryByTestId("chart-line-Girokonto")
      ).not.toBeInTheDocument();
    });

    it("account with explicit color uses that hex as data-color on the marker", () => {
      renderWithTheme(
        <TrajectoryHorizon
          snapshots={snapshots}
          accounts={[giroAccountWithColor]}
          recurringTransactions={noRecurring}
          isLoading={false}
        />
      );

      expect(screen.getByTestId("chart-line-g1")).toHaveAttribute(
        "data-color",
        "#FF6600"
      );
    });

    it("account with null color falls back to chartColors[kind] on the marker", () => {
      renderWithTheme(
        <TrajectoryHorizon
          snapshots={snapshots}
          accounts={[giroAccount]}
          recurringTransactions={noRecurring}
          isLoading={false}
        />
      );

      expect(screen.getByTestId("chart-line-g1")).toHaveAttribute(
        "data-color",
        theme.colors.chartColors.Girokonto
      );
    });

    it("two same-kind accounts with different colors produce different data-color values on their markers", () => {
      renderWithTheme(
        <TrajectoryHorizon
          snapshots={snapshotsTwoGiro}
          accounts={[giroAccountWithColor, giroAccount2WithColor]}
          recurringTransactions={noRecurring}
          isLoading={false}
        />
      );

      expect(screen.getByTestId("chart-line-g1")).toHaveAttribute(
        "data-color",
        "#FF6600"
      );
      expect(screen.getByTestId("chart-line-g2")).toHaveAttribute(
        "data-color",
        "#0088FF"
      );
    });
  });

  describe("view history link", () => {
    it("renders a View history control in the header when onViewHistory is provided", () => {
      renderWithTheme(
        <TrajectoryHorizon
          snapshots={snapshots}
          accounts={[giroAccount]}
          recurringTransactions={noRecurring}
          isLoading={false}
          onViewHistory={() => {}}
        />
      );

      expect(
        screen.getByRole("button", { name: /view history/i })
      ).toBeInTheDocument();
    });

    it("calls onViewHistory when the View history control is clicked", () => {
      const onViewHistory = vi.fn();
      renderWithTheme(
        <TrajectoryHorizon
          snapshots={snapshots}
          accounts={[giroAccount]}
          recurringTransactions={noRecurring}
          isLoading={false}
          onViewHistory={onViewHistory}
        />
      );

      fireEvent.click(screen.getByRole("button", { name: /view history/i }));

      expect(onViewHistory).toHaveBeenCalledTimes(1);
    });

    it("does not render a View history control when onViewHistory is omitted", () => {
      renderWithTheme(
        <TrajectoryHorizon
          snapshots={snapshots}
          accounts={[giroAccount]}
          recurringTransactions={noRecurring}
          isLoading={false}
        />
      );

      expect(
        screen.queryByRole("button", { name: /view history/i })
      ).not.toBeInTheDocument();
    });

    it("renders the View history control even when there are no accounts", () => {
      renderWithTheme(
        <TrajectoryHorizon
          snapshots={[]}
          accounts={[]}
          recurringTransactions={noRecurring}
          isLoading={false}
          onViewHistory={() => {}}
        />
      );

      expect(
        screen.getByRole("button", { name: /view history/i })
      ).toBeInTheDocument();
    });
  });
});

describe("TrajectoryHorizon — ST marks", () => {
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
  // falling €100 every month and €20,000 more each November, paid off in
  // November 2027.
  const monthly: MonthlySnapshot[] = [];
  let restschuld = 2500000;
  for (let i = 0; i < 27; i++) {
    const year = 2026 + Math.floor((9 + i) / 12);
    const monthNum = ((9 + i) % 12) + 1;
    if (i > 0) {
      restschuld -= 10000;
      if (monthNum === 11) restschuld -= 2000000;
      restschuld = Math.max(0, restschuld);
    }
    monthly.push({
      month: `${year}-${String(monthNum).padStart(2, "0")}`,
      accounts: { g1: { projected: 100000 }, m1: { projected: restschuld } },
      netCashflow: 0,
      totalLiquid: 100000,
    });
  }

  const stMarked = () =>
    chart.data.filter((p) => p.isSTMonth).map((p) => p.label);

  it("marks only annual Sondertilgung months up to and including payoff", () => {
    renderWithTheme(
      <TrajectoryHorizon
        snapshots={monthly}
        accounts={[giroAccount, mortgageAccount]}
        recurringTransactions={[
          transfer("Darlehen", 10000, "monthly"),
          transfer("Sondertilgung", 2000000, "annual", 11),
        ]}
        isLoading={false}
      />
    );

    expect(stMarked()).toEqual(["2026-11", "2027-11"]);
  });
});
