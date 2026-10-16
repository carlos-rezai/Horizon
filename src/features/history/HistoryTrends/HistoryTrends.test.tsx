// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../tokens";
import HistoryTrends from "./HistoryTrends";
import type { HistoryPoint } from "../historyTypes/historyTypes";

// History Trends card (Financial History, issue #243): Saved bars diverging
// around zero, an Unknown month drawn as no bar, and a trailing-12-month
// average line.
//
// The chart cannot lay out in jsdom, so the recharts boundary is stubbed as in
// the HistoryChart test: the chart records its data, each Bar and Cell its
// props, each ReferenceLine its props, and Tooltip its content renderer so a
// hover can be simulated.
const chart = vi.hoisted(() => ({
  data: [] as Record<string, unknown>[],
  bars: [] as Record<string, unknown>[],
  cells: [] as Record<string, unknown>[],
  referenceLines: [] as Record<string, unknown>[],
  tooltipContent: null as ((props: unknown) => React.ReactNode) | null,
}));
/** Starts a fresh recording for one chart render. */
function recordChart(data: Record<string, unknown>[]) {
  chart.data = data;
  chart.bars = [];
  chart.cells = [];
  chart.referenceLines = [];
}
vi.mock("recharts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("recharts")>();
  const Chart = ({
    data,
    children,
  }: {
    data: Record<string, unknown>[];
    children: React.ReactNode;
  }) => {
    recordChart(data);
    return <>{children}</>;
  };
  return {
    ...actual,
    ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
      <>{children}</>
    ),
    ComposedChart: Chart,
    BarChart: Chart,
    Bar: (props: Record<string, unknown> & { children?: React.ReactNode }) => {
      chart.bars.push(props);
      return <>{props.children}</>;
    },
    Cell: (props: Record<string, unknown>) => {
      chart.cells.push(props);
      return null;
    },
    ReferenceLine: (props: Record<string, unknown>) => {
      chart.referenceLines.push(props);
      return null;
    },
    Tooltip: ({
      content,
    }: {
      content: (props: unknown) => React.ReactNode;
    }) => {
      chart.tooltipContent = content;
      return null;
    },
    CartesianGrid: () => null,
    XAxis: () => null,
    YAxis: () => null,
  };
});

afterEach(() => {
  cleanup();
  chart.data = [];
  chart.bars = [];
  chart.cells = [];
  chart.referenceLines = [];
  chart.tooltipContent = null;
});

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

function point(
  month: string,
  monthlySavings: number | null,
  monthlySpending: number | null = null
): HistoryPoint {
  return {
    month,
    totalLiquid: 100000,
    restschuld: 0,
    restschuldBridge: null,
    netCashflow: 0,
    monthlySavings,
    monthlySpending,
    accounts: { g1: 100000 },
  };
}

// January is the span's first month (Unknown); February saved, March lost,
// April saved.
const POINTS: HistoryPoint[] = [
  point("2026-01", null),
  point("2026-02", 10000),
  point("2026-03", -2000),
  point("2026-04", 4000),
];

function renderTrends(points: HistoryPoint[] = POINTS) {
  return renderWithTheme(
    <HistoryTrends points={points} range="all" isLoading={false} />
  );
}

function hover(index: number) {
  const content = chart.tooltipContent;
  if (!content) throw new Error("the trends chart rendered no Tooltip");
  return renderWithTheme(
    <>{content({ active: true, payload: [{ payload: chart.data[index] }] })}</>
  );
}

/** The value the Saved bar draws for a row, read through the bar's own key. */
function savedValue(index: number): unknown {
  expect(chart.bars.length).toBeGreaterThan(0);
  const dataKey = chart.bars[0].dataKey as string;
  return chart.data[index][dataKey];
}

describe("HistoryTrends — card", () => {
  it("renders the trends chart with one row per visible month", () => {
    renderTrends();

    expect(screen.getByTestId("history-trends")).toHaveAttribute(
      "data-months",
      "4"
    );
  });

  it("says that months after the Anchor Date may read low", () => {
    renderTrends();

    expect(screen.getByText(/may read low/i)).toBeInTheDocument();
  });

  it("shows the loading treatment instead of the chart while loading", () => {
    renderWithTheme(<HistoryTrends points={[]} range="all" isLoading={true} />);

    expect(screen.getByTestId("history-trends-loading")).toBeInTheDocument();
    expect(screen.queryByTestId("history-trends")).not.toBeInTheDocument();
  });
});

describe("HistoryTrends — diverging Saved bars", () => {
  it("draws a positive month on the success token", () => {
    renderTrends();

    expect(savedValue(1)).toBe(10000);
    expect(chart.cells[1].fill).toBe(theme.colors.secondary);
    expect(chart.cells[3].fill).toBe(theme.colors.secondary);
  });

  it("draws a negative month on the error token, below zero", () => {
    renderTrends();

    expect(savedValue(2)).toBe(-2000);
    expect(chart.cells[2].fill).toBe(theme.colors.error);
  });
});

describe("HistoryTrends — Unknown months", () => {
  it("draws no bar for a null month: its value stays null, never 0", () => {
    renderTrends();

    expect(savedValue(0)).toBeNull();
  });

  it('reads "No data before {Mon YYYY}" in the tooltip for a null month', () => {
    renderTrends();
    hover(0);

    expect(screen.getByText("No data before Feb 2026")).toBeInTheDocument();
  });
});

describe("HistoryTrends — average line", () => {
  it("draws the trailing-12-month average of the known months as a reference line", () => {
    renderTrends();

    // (10000 - 2000 + 4000) / 3 known months
    const ys = chart.referenceLines.map((l) => l.y);
    expect(ys).toContain(4000);
  });
});

describe("HistoryTrends — not clickable", () => {
  it("gives the bars no click handler", () => {
    renderTrends();

    expect(chart.bars.length).toBeGreaterThan(0);
    for (const bar of chart.bars) expect(bar.onClick).toBeUndefined();
    for (const cell of chart.cells) expect(cell.onClick).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// Spent trend (Financial History, issue #244): a Saved / Spent segmented
// control; Spent draws each month's Monthly Spending as single-series bars
// with their own trailing average, and an Unknown month as no bar.
// ---------------------------------------------------------------------------

// Spending is Unknown in January and February and known from March, so its
// first known month differs from Monthly Savings' (February).
const SPENT_POINTS: HistoryPoint[] = [
  point("2026-01", null, null),
  point("2026-02", 10000, null),
  point("2026-03", -2000, 30000),
  point("2026-04", 4000, 0),
  point("2026-05", 6000, 60000),
];

function showSpent() {
  fireEvent.click(screen.getByRole("button", { name: "Spent" }));
}

/** The values the (single) bar draws for every row, read through its key. */
function barValues(): unknown[] {
  expect(chart.bars).toHaveLength(1);
  const dataKey = chart.bars[0].dataKey as string;
  return chart.data.map((row) => row[dataKey]);
}

describe("HistoryTrends — Saved / Spent switch", () => {
  it("opens on Saved", () => {
    renderTrends(SPENT_POINTS);

    expect(screen.getByRole("button", { name: "Saved" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: "Spent" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
    expect(barValues()).toEqual([null, 10000, -2000, 4000, 6000]);
  });

  it("switches the bars to Monthly Spending when Spent is chosen", () => {
    renderTrends(SPENT_POINTS);
    showSpent();

    expect(screen.getByRole("button", { name: "Spent" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: "Saved" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
    expect(barValues()).toEqual([null, null, 30000, 0, 60000]);
  });

  it("switches back to Monthly Savings when Saved is chosen again", () => {
    renderTrends(SPENT_POINTS);
    showSpent();
    fireEvent.click(screen.getByRole("button", { name: "Saved" }));

    expect(barValues()).toEqual([null, 10000, -2000, 4000, 6000]);
  });
});

describe("HistoryTrends — Spent bars", () => {
  it("draws Spent as a single series: one bar, one fill for every month", () => {
    renderTrends(SPENT_POINTS);
    showSpent();

    expect(chart.bars).toHaveLength(1);
    const fills = new Set(chart.cells.map((c) => c.fill));
    expect(fills.size).toBeLessThanOrEqual(1);
    expect(fills.has(theme.colors.error)).toBe(false);
  });

  it("draws the Spent bars' own trailing-12-month average, not the Saved one", () => {
    renderTrends(SPENT_POINTS);
    showSpent();

    // (30000 + 0 + 60000) / 3 known spending months; the real 0 counts.
    const ys = chart.referenceLines.map((l) => l.y);
    expect(ys).toContain(30000);
    // The Saved average (10000 - 2000 + 4000 + 6000) / 4 is not drawn.
    expect(ys).not.toContain(4500);
  });
});

describe("HistoryTrends — Spent Unknown months", () => {
  it("draws no bar for a null spending month: its value stays null, never 0", () => {
    renderTrends(SPENT_POINTS);
    showSpent();

    const values = barValues();
    expect(values[0]).toBeNull();
    expect(values[1]).toBeNull();
    // A known month with no spending is a real 0, not Unknown.
    expect(values[3]).toBe(0);
  });

  it('reads "No data before {Mon YYYY}" from the first known spending month', () => {
    renderTrends(SPENT_POINTS);
    showSpent();
    hover(1);

    expect(screen.getByText("No data before Mar 2026")).toBeInTheDocument();
  });
});
