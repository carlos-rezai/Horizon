// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../tokens";
import SeriesToggleIndicator from "./SeriesToggleIndicator";

afterEach(() => {
  cleanup();
});

describe("SeriesToggleIndicator", () => {
  it("renders the visible-of-total count with the toggle hint", () => {
    render(
      <ThemeProvider theme={theme}>
        <SeriesToggleIndicator visibleCount={2} total={5} />
      </ThemeProvider>
    );

    expect(
      screen.getByText(/2 of 5 series · click to toggle/)
    ).toBeInTheDocument();
  });
});
