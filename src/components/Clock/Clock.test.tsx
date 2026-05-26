// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../tokens";
import Clock from "./Clock";

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("Clock — primary line", () => {
  it("renders the current hour and minute in HH:MM 24-hour format", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-15T15:30:00"));
    renderWithTheme(<Clock />);
    expect(screen.getByText("15:30")).toBeInTheDocument();
  });
});

describe("Clock — secondary line", () => {
  it("renders weekday, day, and month name with no year", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-15T15:30:00"));
    renderWithTheme(<Clock />);
    expect(screen.getByText("Wednesday, 15 January")).toBeInTheDocument();
  });
});

describe("Clock — zero-padding", () => {
  it("renders midnight as 00:00", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-01T00:00:00"));
    renderWithTheme(<Clock />);
    expect(screen.getByText("00:00")).toBeInTheDocument();
  });

  it("renders noon as 12:00", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-15T12:00:00"));
    renderWithTheme(<Clock />);
    expect(screen.getByText("12:00")).toBeInTheDocument();
  });
});
