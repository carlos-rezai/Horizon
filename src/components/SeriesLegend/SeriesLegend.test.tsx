// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../tokens";
import SeriesLegend from "./SeriesLegend";
import type {
  SeriesDescriptor,
  SeriesVisibility,
} from "../../utils/trajectory/trajectory";

const SERIES: SeriesDescriptor[] = [
  {
    key: "totalLiquid",
    name: "Total Liquid",
    color: "#E6B559",
    kind: "liquid",
    dashed: false,
  },
  {
    key: "giro",
    name: "Everyday",
    color: "#4C8FBF",
    kind: "account",
    dashed: false,
  },
  {
    key: "restschuld",
    name: "Restschuld",
    color: "#CE8278",
    kind: "debt",
    dashed: true,
  },
];

const VISIBILITY: SeriesVisibility = {
  totalLiquid: false,
  giro: true,
  restschuld: true,
};

function renderLegend(
  overrides: Partial<React.ComponentProps<typeof SeriesLegend>> = {}
) {
  const props = {
    series: SERIES,
    visibility: VISIBILITY,
    onToggle: vi.fn(),
    onIsolate: vi.fn(),
    onShowAll: vi.fn(),
    ...overrides,
  };
  render(
    <ThemeProvider theme={theme}>
      <SeriesLegend {...props} />
    </ThemeProvider>
  );
  return props;
}

afterEach(() => {
  cleanup();
});

describe("SeriesLegend", () => {
  it("renders a chip per series with pressed state reflecting visibility", () => {
    renderLegend();

    expect(
      screen.getByRole("button", { name: /Total Liquid/ })
    ).toHaveAttribute("aria-pressed", "false");
    expect(screen.getByRole("button", { name: /Everyday/ })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("shows a SUM badge only on the liquid series", () => {
    renderLegend();
    expect(screen.getByText("SUM")).toBeInTheDocument();
  });

  it("calls onToggle with the series key on click", () => {
    const { onToggle } = renderLegend();
    fireEvent.click(screen.getByRole("button", { name: /Everyday/ }));
    expect(onToggle).toHaveBeenCalledWith("giro");
  });

  it("calls onIsolate with the series key on double-click", () => {
    const { onIsolate } = renderLegend();
    fireEvent.doubleClick(screen.getByRole("button", { name: /Everyday/ }));
    expect(onIsolate).toHaveBeenCalledWith("giro");
  });

  it("shows 'Show all' only when a series is hidden, and calls onShowAll", () => {
    const { onShowAll } = renderLegend();
    const showAll = screen.getByRole("button", { name: /Show all/ });
    fireEvent.click(showAll);
    expect(onShowAll).toHaveBeenCalledTimes(1);
  });

  it("omits 'Show all' when every series is visible", () => {
    renderLegend({
      visibility: { totalLiquid: true, giro: true, restschuld: true },
    });
    expect(screen.queryByRole("button", { name: /Show all/ })).toBeNull();
  });

  it("applies the given testId to the legend container", () => {
    renderLegend({ testId: "trajectory-legend" });
    expect(screen.getByTestId("trajectory-legend")).toBeInTheDocument();
  });
});
