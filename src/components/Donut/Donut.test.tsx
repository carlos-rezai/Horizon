// @vitest-environment jsdom
import { render, cleanup, within } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../tokens";
import Donut from "./Donut";

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

const segments = [
  { label: "Food", color: "#74C29B", amount: 30000 },
  { label: "Shopping", color: "#7FA7D9", amount: 20000 },
  { label: "Transport", color: "#E0A86B", amount: 10000 },
];

afterEach(() => {
  cleanup();
});

describe("Donut", () => {
  it("renders one arc per slice", () => {
    const { container } = renderWithTheme(<Donut segments={segments} />);
    const sectors = container.querySelectorAll("path.recharts-sector");
    expect(sectors.length).toBe(segments.length);
  });

  it("renders a centre total label and the summed value", () => {
    const { getByTestId } = renderWithTheme(<Donut segments={segments} />);
    const center = getByTestId("donut-center");
    expect(center).toHaveTextContent("Total");
    // 30000 + 20000 + 10000 = 60000 cents → 600,00 €
    expect(center).toHaveTextContent("600,00");
  });

  it("renders one legend row per slice with label and amount", () => {
    const { getAllByTestId } = renderWithTheme(<Donut segments={segments} />);
    const rows = getAllByTestId("donut-legend-row");
    expect(rows).toHaveLength(segments.length);
    expect(rows[0]).toHaveTextContent("Food");
    expect(within(rows[0]).getByTestId("money")).toHaveTextContent("300,00");
  });

  it("each legend row shows the slice colour", () => {
    const { getAllByTestId } = renderWithTheme(<Donut segments={segments} />);
    const rows = getAllByTestId("donut-legend-row");
    const swatch = rows[1].querySelector('[data-testid="donut-swatch"]');
    expect(swatch).toHaveAttribute("data-color", "#7FA7D9");
  });

  it("uses a custom centre label when provided", () => {
    const { getByTestId } = renderWithTheme(
      <Donut segments={segments} centerLabel="Spent" />
    );
    expect(getByTestId("donut-center")).toHaveTextContent("Spent");
  });

  it("rounds the centre total to whole euros when wholeCenter is set", () => {
    // 30000 + 20000 + 10000 = 60000 cents → 600 € (no cents), legend unchanged.
    const { getByTestId } = renderWithTheme(
      <Donut segments={segments} wholeCenter />
    );
    const center = getByTestId("donut-center");
    expect(center).toHaveTextContent("600");
    expect(center).not.toHaveTextContent("600,00");
  });
});

describe("Donut — export", () => {
  it("is importable from src/components/index.ts", async () => {
    const { Donut: FromIndex } = await import("../index");
    expect(() =>
      renderWithTheme(<FromIndex segments={segments} />)
    ).not.toThrow();
  });
});
