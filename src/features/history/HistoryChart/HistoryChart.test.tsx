// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../tokens";
import HistoryChart, { HistoryChartTooltip } from "./HistoryChart";
import { formatBalance } from "../../../utils/format/format";
import type { HistoryPoint } from "../historyTypes";
import type { AccountWithBalance } from "../../../types/account";

afterEach(() => {
  cleanup();
  window.localStorage.clear();
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
  openingBalance: 0,
  openingDate: "2020-01-01",
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
  openingBalance: 0,
  openingDate: "2020-01-01",
  balance: 0,
  color: "#0088FF",
  showInTrajectory: false,
};

const mortgage: AccountWithBalance = {
  id: "m1",
  kind: "Mortgage",
  name: "DSL Mortgage",
  openingBalance: 0,
  openingDate: "2020-01-01",
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
    expect(screen.getByText(formatBalance(120000))).toBeInTheDocument();
  });
});
