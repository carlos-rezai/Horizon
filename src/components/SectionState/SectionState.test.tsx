// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../tokens";
import SectionState from "./SectionState";

interface StateOptions {
  isLoading?: boolean;
  error?: string | null;
}

function sectionTree({ isLoading = true, error = null }: StateOptions = {}) {
  return (
    <ThemeProvider theme={theme}>
      <SectionState
        testId="month-section-stats"
        isLoading={isLoading}
        error={error}
        skeleton={<p>Loading placeholder</p>}
      >
        <p>Total spent</p>
      </SectionState>
    </ThemeProvider>
  );
}

afterEach(() => {
  cleanup();
});

/**
 * The skeleton→content handover is deliberately not faded. Fading it in from
 * zero opacity held the largest contentful paint back until the whole
 * progressive reveal had finished — 772ms against 169ms on the Dashboard cold
 * load, with CLS 0.05 against 0.01 (issue #206). Data-swap cross-fades, which
 * is what the motion work was for, are unaffected and still live in the Month
 * and account swaps.
 */
describe("SectionState — state handover", () => {
  it("shows the skeleton while its data is pending", () => {
    render(sectionTree({ isLoading: true }));

    expect(screen.getByText("Loading placeholder")).toBeInTheDocument();
    expect(screen.queryByText("Total spent")).not.toBeInTheDocument();
  });

  it("shows the content once the data lands", () => {
    const { rerender } = render(sectionTree({ isLoading: true }));

    rerender(sectionTree({ isLoading: false }));

    expect(screen.getByText("Total spent")).toBeInTheDocument();
    expect(screen.queryByText("Loading placeholder")).not.toBeInTheDocument();
  });

  it("shows the error rather than sitting on the skeleton when it fails", () => {
    const { rerender } = render(sectionTree({ isLoading: true }));

    rerender(sectionTree({ isLoading: true, error: "Network down" }));

    expect(screen.getByText(/Network down/)).toBeInTheDocument();
    expect(screen.queryByText("Loading placeholder")).not.toBeInTheDocument();
  });

  it("hands over in the element it already occupies, rather than remounting to fade", () => {
    const { rerender } = render(sectionTree({ isLoading: true }));
    const whileLoading = screen.getByTestId("month-section-stats");

    rerender(sectionTree({ isLoading: false }));

    // The section holds its place across the handover: same element, new
    // contents, no fade wrapper remounting underneath it.
    expect(screen.getByTestId("month-section-stats")).toBe(whileLoading);
    expect(
      screen.queryByTestId("month-section-stats-fade")
    ).not.toBeInTheDocument();
  });
});
