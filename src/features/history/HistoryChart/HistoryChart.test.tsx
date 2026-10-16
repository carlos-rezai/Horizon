// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../tokens";
import HistoryChart, { HistoryChartTooltip } from "./HistoryChart";
import { formatBalance } from "../../../utils/format/format";
import type { HistoryPoint } from "../historyTypes/historyTypes";
import type { AccountWithBalance } from "../../../types/account";

// The chart cannot lay out in jsdom, so the recharts boundary is stubbed: the
// container passes its children through, ComposedChart records the data it was
// handed, each Line records its props, and Tooltip records its content renderer
// so a hover can be simulated. Everything outside recharts renders for real.
const chart = vi.hoisted(() => ({
  data: [] as Record<string, unknown>[],
  lines: [] as Record<string, unknown>[],
  tooltipContent: null as ((props: unknown) => React.ReactNode) | null,
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
      data: Record<string, unknown>[];
      children: React.ReactNode;
    }) => {
      chart.data = data;
      chart.lines = [];
      return <>{children}</>;
    },
    Line: (props: Record<string, unknown>) => {
      chart.lines.push(props);
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
    ReferenceLine: () => null,
  };
});

afterEach(() => {
  cleanup();
  window.localStorage.clear();
  chart.data = [];
  chart.lines = [];
  chart.tooltipContent = null;
});

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

const HISTORY_KEY = "horizon.history.visibility.v1";
const DASHBOARD_KEY = "horizon.trajectory.visibility.v2";

const giro: AccountWithBalance = {
  id: "g1",
  kind: "Girokonto",
  name: "Main",
  anchorBalance: 0,
  anchorDate: "2020-01-01",
  balance: 0,
  color: null,
  showInTrajectory: true,
};

const giroWithColor: AccountWithBalance = {
  ...giro,
  color: "#FF6600",
};

const giroHidden: AccountWithBalance = {
  id: "g2",
  kind: "Girokonto",
  name: "Rainy Day",
  anchorBalance: 0,
  anchorDate: "2020-01-01",
  balance: 0,
  color: "#0088FF",
  showInTrajectory: false,
};

const mortgage: AccountWithBalance = {
  id: "m1",
  kind: "Mortgage",
  name: "DSL Mortgage",
  anchorBalance: 0,
  anchorDate: "2020-01-01",
  balance: 0,
};

/** Build `count` sequential monthly points from 2020-01 forward. */
function makePoints(
  count: number,
  accountIds: string[] = ["g1"]
): HistoryPoint[] {
  const points: HistoryPoint[] = [];
  for (let i = 0; i < count; i++) {
    const year = 2020 + Math.floor(i / 12);
    const month = (i % 12) + 1;
    const accounts: Record<string, number> = {};
    for (const id of accountIds) accounts[id] = 100000 + i * 1000;
    points.push({
      month: `${year}-${String(month).padStart(2, "0")}`,
      totalLiquid: 100000 + i * 1000,
      restschuld: Math.max(0, 20000000 - i * 100000),
      netCashflow: 5000,
      accounts,
    });
  }
  return points;
}

describe("HistoryChart — states", () => {
  it("renders a loading indicator when isLoading is true", () => {
    renderWithTheme(
      <HistoryChart points={[]} accounts={[]} isLoading={true} />
    );

    expect(screen.getByTestId("history-chart-loading")).toBeInTheDocument();
  });

  it("does not render the chart when isLoading is true", () => {
    renderWithTheme(
      <HistoryChart
        points={makePoints(12)}
        accounts={[giro]}
        isLoading={true}
      />
    );

    expect(screen.queryByTestId("history-chart")).not.toBeInTheDocument();
  });

  it("renders the chart when points and accounts are present", () => {
    renderWithTheme(
      <HistoryChart
        points={makePoints(12)}
        accounts={[giro]}
        isLoading={false}
      />
    );

    expect(screen.getByTestId("history-chart")).toBeInTheDocument();
  });
});

describe("HistoryChart — series & colors", () => {
  it("renders a per-account color marker keyed by account id", () => {
    renderWithTheme(
      <HistoryChart
        points={makePoints(12)}
        accounts={[giro]}
        isLoading={false}
      />
    );

    expect(screen.getByTestId("chart-line-g1")).toBeInTheDocument();
  });

  it("uses the account's explicit color on its marker", () => {
    renderWithTheme(
      <HistoryChart
        points={makePoints(12)}
        accounts={[giroWithColor]}
        isLoading={false}
      />
    );

    expect(screen.getByTestId("chart-line-g1")).toHaveAttribute(
      "data-color",
      "#FF6600"
    );
  });

  it("falls back to chartColors[kind] when the account color is null", () => {
    renderWithTheme(
      <HistoryChart
        points={makePoints(12)}
        accounts={[giro]}
        isLoading={false}
      />
    );

    expect(screen.getByTestId("chart-line-g1")).toHaveAttribute(
      "data-color",
      theme.colors.chartColors.Girokonto
    );
  });

  it("shows a Total Liquid legend series", () => {
    renderWithTheme(
      <HistoryChart
        points={makePoints(12)}
        accounts={[giro]}
        isLoading={false}
      />
    );

    expect(
      screen.getByRole("button", { name: /Total Liquid/i })
    ).toBeInTheDocument();
  });

  it("shows a Restschuld legend series when a mortgage account exists", () => {
    renderWithTheme(
      <HistoryChart
        points={makePoints(12, ["g1", "m1"])}
        accounts={[giro, mortgage]}
        isLoading={false}
      />
    );

    expect(
      screen.getByRole("button", { name: /Restschuld/i })
    ).toBeInTheDocument();
  });

  it("does not show a Restschuld legend series when no mortgage exists", () => {
    renderWithTheme(
      <HistoryChart
        points={makePoints(12)}
        accounts={[giro]}
        isLoading={false}
      />
    );

    expect(
      screen.queryByRole("button", { name: /Restschuld/i })
    ).not.toBeInTheDocument();
  });

  it("never renders a payoff marker even when the mortgage reaches zero", () => {
    renderWithTheme(
      <HistoryChart
        points={makePoints(40, ["g1", "m1"])}
        accounts={[giro, mortgage]}
        isLoading={false}
      />
    );

    expect(screen.queryByTestId("payoff-marker")).not.toBeInTheDocument();
  });
});

describe("HistoryChart — range chips", () => {
  it("renders 1 Year / 3 Years / All history chips", () => {
    renderWithTheme(
      <HistoryChart
        points={makePoints(40)}
        accounts={[giro]}
        isLoading={false}
      />
    );

    expect(screen.getByRole("button", { name: "1 Year" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "3 Years" })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "All history" })
    ).toBeInTheDocument();
  });

  it("selects All history by default", () => {
    renderWithTheme(
      <HistoryChart
        points={makePoints(40)}
        accounts={[giro]}
        isLoading={false}
      />
    );

    expect(screen.getByRole("button", { name: "All history" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByRole("button", { name: "1 Year" })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("shows all months under All history", () => {
    renderWithTheme(
      <HistoryChart
        points={makePoints(40)}
        accounts={[giro]}
        isLoading={false}
      />
    );

    expect(screen.getByTestId("history-chart")).toHaveAttribute(
      "data-months",
      "40"
    );
  });

  it("narrows to the last 12 months when 1 Year is selected", () => {
    renderWithTheme(
      <HistoryChart
        points={makePoints(40)}
        accounts={[giro]}
        isLoading={false}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "1 Year" }));

    expect(screen.getByRole("button", { name: "1 Year" })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(screen.getByTestId("history-chart")).toHaveAttribute(
      "data-months",
      "12"
    );
  });

  it("narrows to the last 36 months when 3 Years is selected", () => {
    renderWithTheme(
      <HistoryChart
        points={makePoints(40)}
        accounts={[giro]}
        isLoading={false}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: "3 Years" }));

    expect(screen.getByTestId("history-chart")).toHaveAttribute(
      "data-months",
      "36"
    );
  });
});

describe("HistoryChart — default visibility", () => {
  it("has Total Liquid off by default", () => {
    renderWithTheme(
      <HistoryChart
        points={makePoints(12)}
        accounts={[giro]}
        isLoading={false}
      />
    );

    expect(
      screen.getByRole("button", { name: /Total Liquid/i })
    ).toHaveAttribute("aria-pressed", "false");
  });

  it("has an account with showInTrajectory true on by default", () => {
    renderWithTheme(
      <HistoryChart
        points={makePoints(12)}
        accounts={[giro]}
        isLoading={false}
      />
    );

    expect(screen.getByRole("button", { name: /Main/i })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("has an account with showInTrajectory false off by default", () => {
    renderWithTheme(
      <HistoryChart
        points={makePoints(12, ["g1", "g2"])}
        accounts={[giro, giroHidden]}
        isLoading={false}
      />
    );

    expect(screen.getByRole("button", { name: /Rainy Day/i })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("has Restschuld on by default when a mortgage exists", () => {
    renderWithTheme(
      <HistoryChart
        points={makePoints(12, ["g1", "m1"])}
        accounts={[giro, mortgage]}
        isLoading={false}
      />
    );

    expect(screen.getByRole("button", { name: /Restschuld/i })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });
});

describe("HistoryChart — legend interaction", () => {
  it("toggles a series off when its chip is clicked", () => {
    renderWithTheme(
      <HistoryChart
        points={makePoints(12, ["g1", "m1"])}
        accounts={[giro, mortgage]}
        isLoading={false}
      />
    );

    const restschuld = screen.getByRole("button", { name: /Restschuld/i });
    expect(restschuld).toHaveAttribute("aria-pressed", "true");

    fireEvent.click(restschuld);

    expect(screen.getByRole("button", { name: /Restschuld/i })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("isolates a single series on double-click", () => {
    renderWithTheme(
      <HistoryChart
        points={makePoints(12, ["g1", "m1"])}
        accounts={[giro, mortgage]}
        isLoading={false}
      />
    );

    fireEvent.doubleClick(
      screen.getByRole("button", { name: /Total Liquid/i })
    );

    expect(
      screen.getByRole("button", { name: /Total Liquid/i })
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: /Main/i })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
    expect(screen.getByRole("button", { name: /Restschuld/i })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

  it("restores every series via Show all after hiding one", () => {
    renderWithTheme(
      <HistoryChart
        points={makePoints(12, ["g1", "m1"])}
        accounts={[giro, mortgage]}
        isLoading={false}
      />
    );

    // Hide the Main account line, which reveals the Show all affordance.
    fireEvent.click(screen.getByRole("button", { name: /Main/i }));
    fireEvent.click(screen.getByRole("button", { name: /Show all/i }));

    expect(screen.getByRole("button", { name: /Main/i })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    expect(
      screen.getByRole("button", { name: /Total Liquid/i })
    ).toHaveAttribute("aria-pressed", "true");
  });
});

describe("HistoryChart — visibility persistence", () => {
  it("persists visibility under horizon.history.visibility.v1", () => {
    renderWithTheme(
      <HistoryChart
        points={makePoints(12)}
        accounts={[giro]}
        isLoading={false}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Main/i }));

    expect(window.localStorage.getItem(HISTORY_KEY)).not.toBeNull();
  });

  it("never writes the Dashboard chart's visibility key", () => {
    window.localStorage.setItem(DASHBOARD_KEY, '{"totalLiquid":true}');

    renderWithTheme(
      <HistoryChart
        points={makePoints(12)}
        accounts={[giro]}
        isLoading={false}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /Main/i }));

    expect(window.localStorage.getItem(DASHBOARD_KEY)).toBe(
      '{"totalLiquid":true}'
    );
  });
});

describe("HistoryChartTooltip", () => {
  const point = {
    label: "2023-05",
    totalLiquid: 500000,
    restschuld: 20000000,
    netCashflow: 120000,
    g1: 500000,
    monthIndex: 4,
  };

  it("renders nothing when inactive", () => {
    const { container } = renderWithTheme(
      <HistoryChartTooltip active={false} payload={[]} series={[]} />
    );

    expect(container).toBeEmptyDOMElement();
  });

  it("shows the Net Cashflow for the hovered month", () => {
    renderWithTheme(
      <HistoryChartTooltip
        active={true}
        payload={[{ payload: point }]}
        series={[]}
      />
    );

    expect(screen.getByText(/Net Cashflow/i)).toBeInTheDocument();
    // formatBalance emits a U+00A0 no-break space that the default normalizer
    // collapses, so a string matcher can never equal it — compare the exact
    // formatted value against the element's raw textContent instead (the same
    // pattern used in YearComparison.test.tsx).
    expect(
      screen.getByText((_, el) => el?.textContent === formatBalance(120000))
    ).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Unknown months (Balance Anchor, issue #235) — a month before Known Since
// carries `null`, and the tooltip names that series' first known month instead
// of showing €0.
// ---------------------------------------------------------------------------

describe("HistoryChart — Unknown months", () => {
  // The Main account is Known Since March 2026, the mortgage since February.
  const unknownPoints: HistoryPoint[] = [
    {
      month: "2026-01",
      totalLiquid: null,
      restschuld: null,
      netCashflow: 0,
      accounts: { g1: null, m1: null },
    },
    {
      month: "2026-02",
      totalLiquid: null,
      restschuld: 20000000,
      netCashflow: 0,
      accounts: { g1: null, m1: 20000000 },
    },
    {
      month: "2026-03",
      totalLiquid: 100000,
      restschuld: 19900000,
      netCashflow: 5000,
      accounts: { g1: 100000, m1: 19900000 },
    },
  ];

  function renderUnknown() {
    return renderWithTheme(
      <HistoryChart
        points={unknownPoints}
        accounts={[giro, mortgage]}
        isLoading={false}
      />
    );
  }

  function hover(index: number) {
    const content = chart.tooltipContent;
    if (!content) throw new Error("the chart rendered no Tooltip");
    return renderWithTheme(
      <>
        {content({ active: true, payload: [{ payload: chart.data[index] }] })}
      </>
    );
  }

  it('reads "No data before {Mon YYYY}" in the tooltip for an Unknown account', () => {
    renderUnknown();
    hover(0);

    expect(screen.getByText("No data before Mar 2026")).toBeInTheDocument();
  });

  it('reads "No data before {Mon YYYY}" for an Unknown Restschuld, from the mortgage\'s own first known month', () => {
    renderUnknown();
    hover(0);

    expect(screen.getByText("No data before Feb 2026")).toBeInTheDocument();
  });

  // History Span (issue #239): a month where every account is Unknown has no
  // real Net Cashflow, so the tooltip leaves the row out rather than read €0.
  it("leaves the Net Cashflow row out of the tooltip in an all-Unknown month", () => {
    renderUnknown();
    hover(0);

    expect(screen.queryByText(/Net Cashflow/i)).not.toBeInTheDocument();
  });

  it("keeps the Net Cashflow row in a month where an account is known", () => {
    renderUnknown();
    hover(2);

    expect(screen.getByText(/Net Cashflow/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// Paydown Bridge (Financial History, issue #240) — a dotted, faded line from
// the Original Principal in the Mortgage Start month to the Restschuld in the
// Mortgage's first known month, governed by the Restschuld toggle.
// ---------------------------------------------------------------------------

describe("HistoryChart — Paydown Bridge", () => {
  // Mortgage Start Feb 2026 at 20000000; the mortgage is Known Since Apr 2026
  // at 19000000, so 1000000 was paid off Feb 2026–Apr 2026.
  const originatedMortgage: AccountWithBalance = {
    ...mortgage,
    originalPrincipal: 20000000,
    startDate: "2026-02-01",
  };

  const bridgePoints: HistoryPoint[] = [
    {
      month: "2026-01",
      totalLiquid: 100000,
      restschuld: null,
      restschuldBridge: null,
      netCashflow: 0,
      accounts: { g1: 100000, m1: null },
    },
    {
      month: "2026-02",
      totalLiquid: 100000,
      restschuld: null,
      restschuldBridge: 20000000,
      netCashflow: 0,
      accounts: { g1: 100000, m1: null },
    },
    {
      month: "2026-03",
      totalLiquid: 100000,
      restschuld: null,
      restschuldBridge: 19500000,
      netCashflow: 0,
      accounts: { g1: 100000, m1: null },
    },
    {
      month: "2026-04",
      totalLiquid: 100000,
      restschuld: 19000000,
      restschuldBridge: 19000000,
      netCashflow: 0,
      accounts: { g1: 100000, m1: 19000000 },
    },
    {
      month: "2026-05",
      totalLiquid: 100000,
      restschuld: 18900000,
      restschuldBridge: null,
      netCashflow: 0,
      accounts: { g1: 100000, m1: 18900000 },
    },
  ] as HistoryPoint[];

  function renderBridge() {
    return renderWithTheme(
      <HistoryChart
        points={bridgePoints}
        accounts={[giro, originatedMortgage]}
        isLoading={false}
      />
    );
  }

  function hover(index: number) {
    const content = chart.tooltipContent;
    if (!content) throw new Error("the chart rendered no Tooltip");
    return renderWithTheme(
      <>
        {content({ active: true, payload: [{ payload: chart.data[index] }] })}
      </>
    );
  }

  function bridgeLine() {
    return chart.lines.find((l) => l.dataKey === "restschuldBridge");
  }

  function restschuldLine() {
    return chart.lines.find((l) => l.dataKey === "restschuld");
  }

  it("renders a dotted bridge line in the Restschuld colour", () => {
    renderBridge();

    const line = bridgeLine();
    expect(line).toBeDefined();
    expect(line?.stroke).toBe(theme.colors.restschuldStrokeColor);
    expect(line?.strokeDasharray).toBeDefined();
    expect(line?.hide).toBe(false);
  });

  it("hands the chart the bridge values month by month", () => {
    renderBridge();

    expect(chart.data.map((d) => d.restschuldBridge)).toEqual([
      null,
      20000000,
      19500000,
      19000000,
      null,
    ]);
  });

  it('reads "No monthly data · €X paid off {Mon YYYY}–{Mon YYYY}" for the Restschuld in a bridge month', () => {
    renderBridge();
    hover(2);

    const expected = `No monthly data · ${formatBalance(1000000)} paid off Feb 2026–Apr 2026`;
    expect(
      screen.getByText(
        (_, el) => el?.textContent === expected && el.children.length === 0
      )
    ).toBeInTheDocument();
  });

  it("never shows the interpolated bridge amount in the tooltip", () => {
    renderBridge();
    hover(2);

    expect(
      screen.queryByText((_, el) =>
        (el?.textContent ?? "").includes(formatBalance(19500000))
      )
    ).toBeNull();
    expect(screen.queryByText(/No data before/)).toBeNull();
  });

  it("hides both the Restschuld line and its bridge when Restschuld is toggled off", () => {
    renderBridge();

    fireEvent.click(screen.getByRole("button", { name: /Restschuld/i }));

    expect(restschuldLine()?.hide).toBe(true);
    expect(bridgeLine()?.hide).toBe(true);
  });
});
