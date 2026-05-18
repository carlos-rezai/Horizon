// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../tokens";
import DatePicker from "./DatePicker";

afterEach(() => cleanup());

function renderDatePicker(
  value: string,
  onChange = vi.fn(),
  extras: { minDate?: string; maxDate?: string } = {}
) {
  return render(
    <ThemeProvider theme={theme}>
      <DatePicker
        value={value}
        onChange={onChange}
        aria-label="Date"
        {...extras}
      />
    </ThemeProvider>
  );
}

describe("DatePicker — display", () => {
  it("displays an ISO date string as DD.MM.YYYY", () => {
    renderDatePicker("2024-01-15");
    expect(screen.getByText("15.01.2024")).toBeInTheDocument();
  });

  it("formats single-digit day and month with leading zeros", () => {
    renderDatePicker("2024-03-05");
    expect(screen.getByText("05.03.2024")).toBeInTheDocument();
  });
});

describe("DatePicker — onChange", () => {
  it("calls onChange with an ISO string when a date is selected", () => {
    const onChange = vi.fn();
    renderDatePicker("2024-01-15", onChange);
    fireEvent.change(screen.getByLabelText("Date"), {
      target: { value: "2024-03-20" },
    });
    expect(onChange).toHaveBeenCalledWith("2024-03-20");
  });
});

describe("DatePicker — minDate / maxDate", () => {
  it("sets the min attribute on the input when minDate is provided", () => {
    renderDatePicker("2024-06-15", vi.fn(), { minDate: "2024-06-01" });
    expect(screen.getByLabelText("Date")).toHaveAttribute("min", "2024-06-01");
  });

  it("sets the max attribute on the input when maxDate is provided", () => {
    renderDatePicker("2024-06-15", vi.fn(), { maxDate: "2024-06-30" });
    expect(screen.getByLabelText("Date")).toHaveAttribute("max", "2024-06-30");
  });

  it("does not set min attribute when minDate is not provided", () => {
    renderDatePicker("2024-06-15");
    expect(screen.getByLabelText("Date")).not.toHaveAttribute("min");
  });

  it("does not set max attribute when maxDate is not provided", () => {
    renderDatePicker("2024-06-15");
    expect(screen.getByLabelText("Date")).not.toHaveAttribute("max");
  });
});
