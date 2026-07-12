// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../tokens";
import ChartTooltip from "./ChartTooltip";

afterEach(() => {
  cleanup();
});

describe("ChartTooltip", () => {
  it("renders the label and the row children", () => {
    render(
      <ThemeProvider theme={theme}>
        <ChartTooltip label="Nov 2026">
          <div data-testid="row">Liquid: 1.000 €</div>
        </ChartTooltip>
      </ThemeProvider>
    );

    expect(screen.getByText("Nov 2026")).toBeInTheDocument();
    expect(screen.getByTestId("row")).toHaveTextContent("Liquid: 1.000 €");
  });
});
