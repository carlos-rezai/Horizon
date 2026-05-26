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

describe("Clock — live interval", () => {
  it("updates the displayed time after 60 000ms have elapsed", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-15T15:30:00"));
    renderWithTheme(<Clock />);
    expect(screen.getByText("15:30")).toBeInTheDocument();

    act(() => {
      vi.advanceTimersByTime(60_000);
    });

    expect(screen.getByText("15:31")).toBeInTheDocument();
  });

  it("does not update the displayed time before 60 000ms have elapsed", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-15T15:30:00"));
    renderWithTheme(<Clock />);

    act(() => {
      vi.advanceTimersByTime(59_999);
    });

    expect(screen.getByText("15:30")).toBeInTheDocument();
  });
});

describe("Clock — cleanup", () => {
  it("calls clearInterval when the component unmounts", () => {
    vi.useFakeTimers();
    const clearIntervalSpy = vi.spyOn(window, "clearInterval");
    const { unmount } = renderWithTheme(<Clock />);
    unmount();
    expect(clearIntervalSpy).toHaveBeenCalled();
    clearIntervalSpy.mockRestore();
  });
});
