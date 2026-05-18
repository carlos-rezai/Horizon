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
  it("displays an ISO date string as DD.MM.YYYY in the input", () => {
    renderDatePicker("2024-01-15");
    expect(screen.getByLabelText("Date")).toHaveValue("15.01.2024");
  });

  it("formats single-digit day and month with leading zeros", () => {
    renderDatePicker("2024-03-05");
    expect(screen.getByLabelText("Date")).toHaveValue("05.03.2024");
  });
});

describe("DatePicker — onChange", () => {
  it("calls onChange with an ISO string when a date is selected", () => {
    const onChange = vi.fn();
    renderDatePicker("2024-01-15", onChange);
    fireEvent.change(screen.getByLabelText("Date"), {
      target: { value: "20.03.2024" },
    });
    expect(onChange).toHaveBeenCalledWith("2024-03-20");
  });
});

describe("DatePicker — minDate / maxDate", () => {
  it("renders without error when minDate is provided", () => {
    expect(() =>
      renderDatePicker("2024-06-15", vi.fn(), { minDate: "2024-06-01" })
    ).not.toThrow();
  });

  it("renders without error when maxDate is provided", () => {
    expect(() =>
      renderDatePicker("2024-06-15", vi.fn(), { maxDate: "2024-06-30" })
    ).not.toThrow();
  });

  it("renders without error when neither minDate nor maxDate is provided", () => {
    expect(() => renderDatePicker("2024-06-15")).not.toThrow();
  });
});
