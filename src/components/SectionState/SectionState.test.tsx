// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../tokens";
import SectionState from "./SectionState";

const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";

/** jsdom ships no matchMedia; the preference is stubbed at the window. */
function stubReducedMotion(matches: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query === REDUCE_QUERY ? matches : false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  }));
}

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
  vi.unstubAllGlobals();
});

describe("SectionState — skeleton→content fade", () => {
  it("renders each of its three states inside the section's fade wrapper", () => {
    stubReducedMotion(false);

    const { rerender } = render(sectionTree({ isLoading: true }));
    expect(screen.getByTestId("month-section-stats-fade")).toBeInTheDocument();

    rerender(sectionTree({ isLoading: false }));
    expect(screen.getByTestId("month-section-stats-fade")).toBeInTheDocument();

    rerender(sectionTree({ isLoading: false, error: "Network down" }));
    expect(screen.getByTestId("month-section-stats-fade")).toBeInTheDocument();
  });

  it("fades the skeleton into the content when the section's data lands", () => {
    stubReducedMotion(false);

    const { rerender } = render(sectionTree({ isLoading: true }));
    expect(screen.getByText("Loading placeholder")).toBeInTheDocument();
    const whileLoading = screen.getByTestId("month-section-stats-fade");

    rerender(sectionTree({ isLoading: false }));

    // A fresh wrapper is what replays the fade — the skeleton does not simply
    // hard-cut to the content in the element it was already occupying.
    expect(screen.getByText("Total spent")).toBeInTheDocument();
    expect(screen.getByTestId("month-section-stats-fade")).not.toBe(
      whileLoading
    );
  });

  it("fades the skeleton into the error state when the section fails", () => {
    stubReducedMotion(false);

    const { rerender } = render(sectionTree({ isLoading: true }));
    const whileLoading = screen.getByTestId("month-section-stats-fade");

    rerender(sectionTree({ isLoading: true, error: "Network down" }));

    expect(screen.getByText(/Network down/)).toBeInTheDocument();
    expect(screen.getByTestId("month-section-stats-fade")).not.toBe(
      whileLoading
    );
  });

  it("suppresses the fade when reduced motion is preferred", () => {
    stubReducedMotion(true);

    render(sectionTree({ isLoading: true }));

    expect(screen.getByTestId("month-section-stats-fade")).toHaveAttribute(
      "data-motion",
      "none"
    );
  });
});
