// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../tokens";
import DayBlock from "./DayBlock";

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

afterEach(() => {
  cleanup();
});

describe("DayBlock", () => {
  it("renders the day without a leading zero", () => {
    renderWithTheme(<DayBlock date="2026-09-05" />);
    expect(screen.getByText("5")).toBeInTheDocument();
  });

  it("renders a two-digit day as is", () => {
    renderWithTheme(<DayBlock date="2026-09-25" />);
    expect(screen.getByText("25")).toBeInTheDocument();
  });

  it("renders the short month label", () => {
    renderWithTheme(<DayBlock date="2026-09-05" />);
    expect(screen.getByText("Sep")).toBeInTheDocument();
  });

  it("renders January and December at either end of the year", () => {
    renderWithTheme(
      <>
        <DayBlock date="2026-01-01" />
        <DayBlock date="2026-12-31" />
      </>
    );
    expect(screen.getByText("Jan")).toBeInTheDocument();
    expect(screen.getByText("Dec")).toBeInTheDocument();
  });

  it("puts the day number before the month", () => {
    const { container } = renderWithTheme(<DayBlock date="2026-09-05" />);
    expect(container.textContent).toBe("5Sep");
  });
});
