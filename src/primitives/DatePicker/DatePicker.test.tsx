// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../tokens";
import DatePicker from "./DatePicker";
import { cascaded, computedColor } from "../../testing/cascaded/cascaded";

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

// Issue #268 — DatePicker takes the Button's `size` prop and renders its
// field at that Control Height.
describe("DatePicker — Control Height", () => {
  const sizes = ["sm", "md", "lg"] as const;

  sizes.forEach((size) => {
    it(`renders size "${size}" at the ${size} Control Height`, () => {
      render(
        <ThemeProvider theme={theme}>
          <DatePicker
            value="2024-01-15"
            onChange={vi.fn()}
            aria-label="Date"
            size={size}
          />
        </ThemeProvider>
      );
      expect(getComputedStyle(screen.getByLabelText("Date")).height).toBe(
        `${theme.sizing.control[size]}px`
      );
    });
  });

  it("renders at the md Control Height when no size is given", () => {
    renderDatePicker("2024-01-15");
    expect(getComputedStyle(screen.getByLabelText("Date")).height).toBe(
      `${theme.sizing.control.md}px`
    );
  });
});

// Issue #269 — the DatePicker composes the Input primitive (its calendar
// icon in Input's trailing-icon slot) instead of keeping a copy of the input
// styles, and its calendar pop-up reads in the UI font.
const datePickerSources = import.meta.glob(
  ["./DatePicker.tsx", "./DatePicker.styles.ts"],
  { query: "?raw", import: "default", eager: true }
) as Record<string, string>;

describe("DatePicker — composes Input", () => {
  it("renders its field through the Input primitive", () => {
    expect(datePickerSources["./DatePicker.tsx"]).toMatch(
      /import\s+Input\s+from\s+["']\.\.\/Input\/Input["']/
    );
  });

  it("keeps no copied input styles of its own", () => {
    expect(datePickerSources["./DatePicker.styles.ts"]).not.toMatch(
      /styled\.input/
    );
  });

  it("shows the calendar icon beside the field", () => {
    const { container } = renderDatePicker("2024-01-15");
    expect(screen.getByLabelText("Date")).toBeInTheDocument();
    expect(container.querySelector("[aria-hidden='true'] svg")).not.toBeNull();
  });
});

describe("DatePicker — calendar pop-up", () => {
  it("renders the calendar in the UI font", () => {
    const { container } = renderDatePicker("2024-01-15");
    fireEvent.click(screen.getByLabelText("Date"));
    const calendar = container.querySelector(".react-datepicker");
    expect(calendar).not.toBeNull();
    expect(getComputedStyle(calendar as HTMLElement).fontFamily).toContain(
      "Space Grotesk"
    );
  });

  it("still calls onChange with an ISO string when a day is clicked", () => {
    const onChange = vi.fn();
    renderDatePicker("2024-01-15", onChange);
    fireEvent.click(screen.getByLabelText("Date"));
    fireEvent.click(
      screen.getByRole("gridcell", { name: /January 20th, 2024/ })
    );
    expect(onChange).toHaveBeenCalledWith("2024-01-20");
  });
});

/** Today as an ISO date in local time, and a different day in its month. */
function todayAndAnotherDay(): { today: string; other: string } {
  const now = new Date();
  const iso = (day: number) =>
    `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  return {
    today: iso(now.getDate()),
    other: iso(now.getDate() === 1 ? 2 : 1),
  };
}

// Refactor #278 (Audit Finding 10) — the calendar reads in the gold tokens,
// not react-datepicker blue, and shows its month navigation.
describe("DatePicker — calendar navigation and today", () => {
  it("draws today's cell in the gold token", () => {
    renderDatePicker(todayAndAnotherDay().other);
    fireEvent.click(screen.getByLabelText("Date"));
    const today = screen
      .getAllByRole("gridcell")
      .find((cell) => cell.getAttribute("aria-current") === "date");
    expect(today).toBeDefined();
    expect(getComputedStyle(today as HTMLElement).color).toBe(
      computedColor(theme.colors.primary)
    );
  });

  it("draws the keyboard-selected cell in the gold tokens", () => {
    renderDatePicker("2024-01-15");
    const input = screen.getByLabelText("Date");
    fireEvent.click(input);
    fireEvent.keyDown(
      screen.getByRole("gridcell", { name: /January 15th, 2024/ }),
      { key: "ArrowRight" }
    );
    const cell = screen.getByRole("gridcell", { name: /January 16th, 2024/ });
    expect(cell.className).toContain(
      "react-datepicker__day--keyboard-selected"
    );
    expect(getComputedStyle(cell).backgroundColor).toBe(
      computedColor(theme.colors.primaryContainer)
    );
    expect(cascaded(cell, "box-shadow")).toBe(
      `inset 0 0 0 1px ${theme.colors.primary}`
    );
  });

  it("shows the Previous and Next month buttons when no bounds are set", () => {
    renderDatePicker("2024-01-15");
    fireEvent.click(screen.getByLabelText("Date"));
    ["Previous Month", "Next Month"].forEach((name) => {
      const button = screen.getByRole("button", { name });
      expect(getComputedStyle(button).display, name).not.toBe("none");
      expect(getComputedStyle(button).height, name).toBe(
        `${theme.sizing.control.sm}px`
      );
    });
  });
});
