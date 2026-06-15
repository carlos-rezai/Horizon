// @vitest-environment jsdom
import { render, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../tokens";
import Sparkline from "./Sparkline";

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

afterEach(() => {
  cleanup();
});

describe("Sparkline", () => {
  it("renders an SVG with a line path for a numeric series", () => {
    const { getByTestId } = renderWithTheme(
      <Sparkline data={[1, 4, 2, 8, 5]} color="#E6B559" />
    );
    const svg = getByTestId("sparkline");
    expect(svg.tagName.toLowerCase()).toBe("svg");
    const paths = svg.querySelectorAll("path");
    // At least the stroke path is present and carries a non-empty `d`.
    expect(paths.length).toBeGreaterThanOrEqual(1);
    expect(paths[0].getAttribute("d")).toBeTruthy();
  });

  it("applies the supplied colour to the stroke", () => {
    const { getByTestId } = renderWithTheme(
      <Sparkline data={[1, 2, 3]} color="#74C29B" />
    );
    const stroke = getByTestId("sparkline").querySelector("path[stroke]");
    expect(stroke?.getAttribute("stroke")).toBe("#74C29B");
  });

  it("renders an area fill path when fill is set", () => {
    const { getByTestId } = renderWithTheme(
      <Sparkline data={[1, 2, 3]} color="#74C29B" fill />
    );
    const paths = getByTestId("sparkline").querySelectorAll("path");
    expect(paths.length).toBe(2);
  });

  it("renders nothing for an empty series", () => {
    const { queryByTestId } = renderWithTheme(
      <Sparkline data={[]} color="#E6B559" />
    );
    expect(queryByTestId("sparkline")).toBeNull();
  });

  it("renders nothing for a single-point series", () => {
    const { queryByTestId } = renderWithTheme(
      <Sparkline data={[42]} color="#E6B559" />
    );
    expect(queryByTestId("sparkline")).toBeNull();
  });

  it("renders no axes, ticks, or text labels", () => {
    const { getByTestId } = renderWithTheme(
      <Sparkline data={[1, 2, 3, 4]} color="#E6B559" />
    );
    const svg = getByTestId("sparkline");
    expect(svg.querySelectorAll("text").length).toBe(0);
    expect(svg.querySelectorAll("line").length).toBe(0);
  });
});

describe("Sparkline — export", () => {
  it("is importable from src/primitives/index.ts", async () => {
    const { Sparkline: FromIndex } = await import("../index");
    expect(() =>
      renderWithTheme(<FromIndex data={[1, 2, 3]} color="#E6B559" />)
    ).not.toThrow();
  });
});
