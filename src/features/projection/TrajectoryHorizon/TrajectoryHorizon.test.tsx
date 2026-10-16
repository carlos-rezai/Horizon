// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { Children, isValidElement, type ReactElement } from "react";
import { Line, ReferenceArea, ReferenceLine } from "recharts";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../tokens";
import TrajectoryHorizon from "./TrajectoryHorizon";
import type { MonthlySnapshot } from "../../../types/projection";
import type { AccountWithBalance } from "../../../types/account";
import type { RecurringTransaction } from "../../../types/recurring";
import { formatMonth } from "../../../utils/format/format";
import type { HistoryPoint } from "../../../types/history";

// The chart itself cannot lay out in jsdom, so the recharts boundary is
// stubbed: ResponsiveContainer passes its children through and ComposedChart
// records the data points it was handed, which carry the ST marks.
type ChartRow = {
  label: string;
  isSTMonth: boolean;
  isPayoffMonth: boolean;
  [key: string]: unknown;
};
const chart = vi.hoisted(() => ({
  data: [] as ChartRow[],
  children: null as React.ReactNode,
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
      children,
    }: {
      data: ChartRow[];
      children?: React.ReactNode;
    }) => {
      chart.data = data;
      chart.children = children;
      return null;
    },
  };
});

afterEach(() => {
  cleanup();
  chart.data = [];
  chart.children = null;
});

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

const giroAccount: AccountWithBalance = {
  id: "g1",
  kind: "Girokonto",
  name: "Main",
  anchorBalance: 0,
  anchorDate: "2026-01-01",
  balance: 0,
  color: null,
};

const giroAccountWithColor: AccountWithBalance = {
  id: "g1",
  kind: "Girokonto",
  name: "Main",
  anchorBalance: 0,
  anchorDate: "2026-01-01",
  balance: 0,
  color: "#FF6600",
};

const giroAccount2WithColor: AccountWithBalance = {
  id: "g2",
  kind: "Girokonto",
  name: "Secondary",
  anchorBalance: 0,
  anchorDate: "2026-01-01",
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
  anchorBalance: 0,
  anchorDate: "2026-01-01",
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

describe("TrajectoryHorizon — two mortgages", () => {
  // m1 is paid off in June 2026, m2 only in September 2026: the plan is
  // debt-free in September. An annual transfer into m2 each August still
  // reduces a Restschuld, so it is an ST Month.
  const secondMortgage: AccountWithBalance = {
    ...mortgageAccount,
    id: "m2",
    name: "KfW Mortgage",
  };
  const months = ["2026-04", "2026-05", "2026-06", "2026-07", "2026-08"]
    .concat(["2026-09", "2026-10", "2026-11", "2026-12", "2027-01"])
    .concat(["2027-02", "2027-03", "2027-04", "2027-05", "2027-06"])
    .concat(["2027-07", "2027-08", "2027-09"]);
  const twoMortgageSnapshots: MonthlySnapshot[] = months.map((month) => ({
    month,
    accounts: {
      g1: { projected: 100000 },
      m1: { projected: month < "2026-06" ? 30000 : 0 },
      m2: { projected: month < "2026-09" ? 60000 : 0 },
    },
    netCashflow: 0,
    totalLiquid: 100000,
  }));
  const augustST: RecurringTransaction = {
    id: "rt-aug",
    accountId: "g1",
    linkedAccountId: "m2",
    amount: 10000,
    description: "Sondertilgung",
    category: "Housing",
    frequency: "annual",
    dayOfMonth: 1,
    monthOfYear: 8,
  };

  function renderTwoMortgages() {
    return renderWithTheme(
      <TrajectoryHorizon
        snapshots={twoMortgageSnapshots}
        accounts={[giroAccount, mortgageAccount, secondMortgage]}
        recurringTransactions={[augustST]}
        isLoading={false}
      />
    );
  }

  it("places the payoff marker on the month the combined Restschuld reaches zero", () => {
    renderTwoMortgages();

    expect(screen.getByTestId("payoff-marker").textContent).toContain(
      formatMonth("2026-09")
    );
    expect(
      chart.data.filter((p) => p.isPayoffMonth).map((p) => p.label)
    ).toEqual(["2026-09"]);
  });

  it("counts a Sondertilgung up to the combined payoff, never after", () => {
    renderTwoMortgages();

    expect(chart.data.filter((p) => p.isSTMonth).map((p) => p.label)).toEqual([
      "2026-08",
    ]);
  });
});

describe("TrajectoryHorizon — Past Lead-in", () => {
  // Today is April 2026: the projection starts at 2026-04 and the history runs
  // January through April, so the lead-in is January to March — three rows.
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-04-15T12:00:00Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  function historyPoint(
    month: string,
    overrides: Partial<HistoryPoint> = {}
  ): HistoryPoint {
    return {
      month,
      totalLiquid: 90000,
      restschuld: 60000,
      restschuldBridge: null,
      netCashflow: 0,
      accounts: { g1: 90000, m1: 60000 },
      ...overrides,
    };
  }

  // January is bridged (Unknown Restschuld), February is the bridge's join,
  // March is known, April is the current month and belongs to the projection.
  const history: HistoryPoint[] = [
    historyPoint("2026-01", {
      restschuld: null,
      restschuldBridge: 80000,
      totalLiquid: null,
      accounts: { g1: null, m1: null },
    }),
    historyPoint("2026-02", { restschuld: 70000, restschuldBridge: 70000 }),
    historyPoint("2026-03"),
    historyPoint("2026-04", { totalLiquid: 999999 }),
  ];

  type ElementProps = Record<string, unknown>;

  function chartElements(): ReactElement<ElementProps>[] {
    return Children.toArray(chart.children).filter(
      (child): child is ReactElement<ElementProps> => isValidElement(child)
    );
  }

  function labelText(label: unknown): string | undefined {
    if (typeof label === "string") return label;
    if (isValidElement<ElementProps>(label)) {
      const { value, children } = label.props;
      if (typeof value === "string") return value;
      if (typeof children === "string") return children;
      return undefined;
    }
    if (label !== null && typeof label === "object" && "value" in label) {
      const { value } = label as { value: unknown };
      return typeof value === "string" ? value : undefined;
    }
    return undefined;
  }

  function todayLine() {
    return chartElements().find(
      (el) => el.type === ReferenceLine && labelText(el.props.label) === "TODAY"
    );
  }

  function actualsBand() {
    return chartElements().find(
      (el) =>
        el.type === ReferenceArea && labelText(el.props.label) === "ACTUALS"
    );
  }

  function lineFor(dataKey: string) {
    return chartElements().find(
      (el) => el.type === Line && el.props.dataKey === dataKey
    );
  }

  function renderChart(props: {
    history?: HistoryPoint[];
    recurringTransactions?: RecurringTransaction[];
  }) {
    return renderWithTheme(
      <TrajectoryHorizon
        snapshots={snapshotsWithPayoff}
        accounts={[giroAccount, mortgageAccount]}
        recurringTransactions={props.recurringTransactions ?? []}
        isLoading={false}
        history={props.history}
      />
    );
  }

  it("puts the lead-in rows before the projected rows, the current month only from the projection", () => {
    renderChart({ history });

    expect(chart.data.map((p) => p.label)).toEqual([
      "2026-01",
      "2026-02",
      "2026-03",
      "2026-04",
      "2026-05",
      "2026-06",
    ]);
    expect(chart.data[3].totalLiquid).toBe(100000);
    expect(chart.data[0].totalLiquid).toBeNull();
  });

  it("places the TODAY Marker at the lead-in's length", () => {
    renderChart({ history });

    expect(todayLine()?.props.x).toBe(3);
  });

  it("keeps the TODAY Marker just after midnight on the 1st, in local time", () => {
    // 00:30 local on 1 April: east of UTC it is still 31 March in UTC, but
    // the projected snapshots start at the local month, April.
    vi.setSystemTime(new Date(2026, 3, 1, 0, 30));
    renderChart({ history });

    expect(todayLine()?.props.x).toBe(3);
  });

  it("draws an ACTUALS band over the lead-in", () => {
    renderChart({ history });

    const band = actualsBand();
    expect(band).toBeDefined();
    expect(band?.props.x1).toBe(0);
  });

  it("draws no ACTUALS band when the history holds only the current month", () => {
    renderChart({ history: [historyPoint("2026-04")] });

    expect(actualsBand()).toBeUndefined();
    expect(todayLine()?.props.x).toBe(0);
  });

  it("draws the Paydown Bridge in the lead-in, governed by the Restschuld toggle", () => {
    renderChart({ history });

    const bridge = lineFor("restschuldBridge");
    expect(bridge).toBeDefined();
    expect(bridge?.props.hide).toBe(lineFor("restschuld")?.props.hide);
    expect(chart.data[0].restschuldBridge).toBe(80000);
    expect(chart.data[0].restschuld).toBeNull();
    expect(chart.data[1].restschuldBridge).toBe(70000);
  });

  it("renders exactly as before when there is no history", () => {
    renderChart({});
    const before = chart.data;
    cleanup();

    renderChart({ history: [] });

    expect(chart.data).toEqual(before);
    expect(chart.data.map((p) => p.label)).toEqual([
      "2026-04",
      "2026-05",
      "2026-06",
    ]);
    expect(actualsBand()).toBeUndefined();
    expect(todayLine()?.props.x).toBe(0);
  });

  it("keeps the Payoff Marker, the Freedom Phase and the ST months on the same months", () => {
    const st: RecurringTransaction = {
      id: "rt-st",
      accountId: "g1",
      linkedAccountId: "m1",
      amount: 10000,
      description: "Sondertilgung",
      category: "Housing",
      frequency: "annual",
      dayOfMonth: 1,
      monthOfYear: 5,
    };
    const marks = () => ({
      payoff: chart.data.filter((p) => p.isPayoffMonth).map((p) => p.label),
      st: chart.data.filter((p) => p.isSTMonth).map((p) => p.label),
      freedom: chart.data
        .filter(
          (p) => p.freedomLiquid !== null && p.freedomLiquid !== undefined
        )
        .map((p) => p.label),
    });

    renderChart({ recurringTransactions: [st] });
    const without = marks();
    const markerText = screen.getByTestId("payoff-marker").textContent;
    cleanup();

    renderChart({ history, recurringTransactions: [st] });

    expect(without).toEqual({
      payoff: ["2026-05"],
      st: ["2026-05"],
      freedom: ["2026-05", "2026-06"],
    });
    expect(marks()).toEqual(without);
    expect(screen.getByTestId("payoff-marker").textContent).toBe(markerText);
    // The payoff line follows its month to index 4, past the three lead-in rows.
    const payoffLine = chartElements().find(
      (el) => el.type === ReferenceLine && el.props.x === 4
    );
    expect(payoffLine).toBeDefined();
  });
});
