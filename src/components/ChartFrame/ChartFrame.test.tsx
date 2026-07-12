// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../tokens";
import ChartFrame from "./ChartFrame";

function renderFrame(
  props: Partial<React.ComponentProps<typeof ChartFrame>> = {}
) {
  render(
    <ThemeProvider theme={theme}>
      <ChartFrame
        overline="Actuals"
        title="Historical Trajectory"
        isLoading={false}
        {...props}
      >
        <div data-testid="chart-body">body</div>
      </ChartFrame>
    </ThemeProvider>
  );
}

afterEach(() => {
  cleanup();
});

describe("ChartFrame", () => {
  it("renders the overline, title, and body when not loading", () => {
    renderFrame();

    expect(screen.getByText("Actuals")).toBeInTheDocument();
    expect(screen.getByText("Historical Trajectory")).toBeInTheDocument();
    expect(screen.getByTestId("chart-body")).toBeInTheDocument();
  });

  it("renders the controls slot in the header", () => {
    renderFrame({ controls: <button type="button">1 Year</button> });
    expect(screen.getByRole("button", { name: "1 Year" })).toBeInTheDocument();
  });

  it("replaces the body with a loading line when loading, exposing the testId", () => {
    renderFrame({ isLoading: true, loadingTestId: "chart-loading" });

    expect(screen.getByTestId("chart-loading")).toHaveTextContent("Loading…");
    expect(screen.queryByTestId("chart-body")).toBeNull();
  });

  it("omits the controls slot when none is given", () => {
    renderFrame();
    // Only the body button-less header — no stray buttons rendered.
    expect(screen.queryByRole("button")).toBeNull();
  });
});
