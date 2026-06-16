// @vitest-environment jsdom
import { render, screen, cleanup, act } from "@testing-library/react";
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

describe("Clock — seconds readout", () => {
  it("renders the dim seconds alongside HH:MM", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-15T15:30:07"));
    renderWithTheme(<Clock />);
    expect(screen.getByText("15:30")).toBeInTheDocument();
    expect(screen.getByText(":07")).toBeInTheDocument();
  });
});

describe("Clock — live interval", () => {
  it("advances the seconds every second", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-15T15:30:30"));
    renderWithTheme(<Clock />);
    expect(screen.getByText(":30")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(1_000);
    });

    expect(screen.getByText(":31")).toBeInTheDocument();
  });

  it("rolls the minute over at the boundary", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-15T15:30:30"));
    renderWithTheme(<Clock />);
    expect(screen.getByText("15:30")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(30_000);
    });

    expect(screen.getByText("15:31")).toBeInTheDocument();
  });
});

describe("Clock — cleanup", () => {
  it("clears the interval when the component unmounts", () => {
    vi.useFakeTimers();
    const clearIntervalSpy = vi.spyOn(window, "clearInterval");
    const { unmount } = renderWithTheme(<Clock />);
    unmount();
    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });
});
