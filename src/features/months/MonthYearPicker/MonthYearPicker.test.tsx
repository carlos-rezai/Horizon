// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../tokens";
import MonthYearPicker from "./MonthYearPicker";

afterEach(cleanup);

function renderPicker(props: {
  month: string;
  importStartDates: string[];
  onJump: (month: string) => void;
}) {
  return render(
    <ThemeProvider theme={theme}>
      <MonthYearPicker {...props} />
    </ThemeProvider>
  );
}

function openPicker() {
  fireEvent.click(screen.getByRole("button", { name: /June 2023/i }));
}

// ---------------------------------------------------------------------------
// Trigger + open/close
// ---------------------------------------------------------------------------

describe("MonthYearPicker", () => {
  it("shows the current month label and keeps the popover closed initially", () => {
    renderPicker({
      month: "2023-06",
      importStartDates: ["2023-03-15"],
      onJump: vi.fn(),
    });

    expect(
      screen.getByRole("button", { name: /June 2023/i })
    ).toBeInTheDocument();
    // No month grid cell is present until the label is clicked.
    expect(screen.queryByRole("button", { name: "Mar" })).toBeNull();
  });

  it("opens a year switcher and a 3x4 month grid on click", () => {
    renderPicker({
      month: "2023-06",
      importStartDates: ["2023-03-15"],
      onJump: vi.fn(),
    });

    openPicker();

    expect(
      screen.getByRole("button", { name: /previous year/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /next year/i })
    ).toBeInTheDocument();
    // Twelve month cells, Jan..Dec.
    for (const label of [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ]) {
      expect(screen.getByRole("button", { name: label })).toBeInTheDocument();
    }
  });

  it("disables months outside the [earliest import, current] range", () => {
    renderPicker({
      month: "2023-06",
      importStartDates: ["2023-03-15"], // March 2023
      onJump: vi.fn(),
    });

    openPicker();

    // Before the earliest import.
    expect(screen.getByRole("button", { name: "Jan" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Feb" })).toBeDisabled();
    // In range.
    expect(screen.getByRole("button", { name: "Mar" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Jun" })).toBeEnabled();
    // After the current month.
    expect(screen.getByRole("button", { name: "Jul" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Dec" })).toBeDisabled();
  });

  it("jumps to the selected month and closes the popover", () => {
    const onJump = vi.fn();
    renderPicker({
      month: "2023-06",
      importStartDates: ["2023-03-15"],
      onJump,
    });

    openPicker();
    fireEvent.click(screen.getByRole("button", { name: "Apr" }));

    expect(onJump).toHaveBeenCalledWith("2023-04");
    expect(screen.queryByRole("button", { name: "Apr" })).toBeNull();
  });

  it("closes on Escape", () => {
    renderPicker({
      month: "2023-06",
      importStartDates: ["2023-03-15"],
      onJump: vi.fn(),
    });

    openPicker();
    expect(screen.getByRole("button", { name: "Mar" })).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });

    expect(screen.queryByRole("button", { name: "Mar" })).toBeNull();
  });

  it("closes on outside click", () => {
    renderPicker({
      month: "2023-06",
      importStartDates: ["2023-03-15"],
      onJump: vi.fn(),
    });

    openPicker();
    expect(screen.getByRole("button", { name: "Mar" })).toBeInTheDocument();

    fireEvent.mouseDown(document.body);

    expect(screen.queryByRole("button", { name: "Mar" })).toBeNull();
  });

  it("stays open when the window is scrolled or resized", () => {
    renderPicker({
      month: "2023-06",
      importStartDates: ["2023-03-15"],
      onJump: vi.fn(),
    });

    openPicker();
    fireEvent.scroll(window);
    fireEvent.resize(window);

    // The popover repositions rather than dismissing.
    expect(screen.getByRole("button", { name: "Mar" })).toBeInTheDocument();
  });

  // -------------------------------------------------------------------------
  // Year switching across a multi-year range
  // -------------------------------------------------------------------------

  it("switches years within bounds and disables the arrow at the edge", () => {
    renderPicker({
      month: "2023-06",
      importStartDates: ["2021-11-20"], // November 2021
      onJump: vi.fn(),
    });

    openPicker();
    // Opens on the current month's year.
    expect(screen.getByText("2023")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /previous year/i }));
    expect(screen.getByText("2022")).toBeInTheDocument();
    // A year fully inside the range: every cell enabled.
    expect(screen.getByRole("button", { name: "Jan" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "Dec" })).toBeEnabled();

    fireEvent.click(screen.getByRole("button", { name: /previous year/i }));
    expect(screen.getByText("2021")).toBeInTheDocument();
    // Earliest year: months before November are disabled.
    expect(screen.getByRole("button", { name: "Oct" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Nov" })).toBeEnabled();
    // Cannot step earlier than the earliest import year.
    expect(
      screen.getByRole("button", { name: /previous year/i })
    ).toBeDisabled();
  });

  // -------------------------------------------------------------------------
  // Graceful degradation with no imports
  // -------------------------------------------------------------------------

  it("pins to the current month when there are no imports", () => {
    renderPicker({
      month: "2023-06",
      importStartDates: [],
      onJump: vi.fn(),
    });

    openPicker();

    // Only the current month is selectable.
    expect(screen.getByRole("button", { name: "Jun" })).toBeEnabled();
    expect(screen.getByRole("button", { name: "May" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Jul" })).toBeDisabled();
    // Year navigation is pinned.
    expect(
      screen.getByRole("button", { name: /previous year/i })
    ).toBeDisabled();
    expect(screen.getByRole("button", { name: /next year/i })).toBeDisabled();
  });
});

// ---------------------------------------------------------------------------
// Issue #270 — Stable Label Width. The trigger reserves the width of the
// longest month-year label it can show, so the arrows beside it hold still
// while the user clicks from "May" to "September".
// ---------------------------------------------------------------------------

/** "September 2026" — the longest month name plus a space and a 4-digit year. */
const LONGEST_LABEL_CHARS = "September".length + " 2026".length;

function triggerFor(label: RegExp): HTMLElement {
  return screen.getByRole("button", { name: label });
}

describe("MonthYearPicker — Stable Label Width", () => {
  it("renders the trigger at the same width for May and September", () => {
    const { rerender } = renderPicker({
      month: "2026-05",
      importStartDates: ["2025-01-15"],
      onJump: vi.fn(),
    });
    const mayWidth = getComputedStyle(triggerFor(/May 2026/i)).minWidth;

    rerender(
      <ThemeProvider theme={theme}>
        <MonthYearPicker
          month="2026-09"
          importStartDates={["2025-01-15"]}
          onJump={vi.fn()}
        />
      </ThemeProvider>
    );
    const septemberWidth = getComputedStyle(
      triggerFor(/September 2026/i)
    ).minWidth;

    // An unset min-width would "match" too, so the reserved width must be set in ch.
    expect(mayWidth).toMatch(/ch$/);
    expect(septemberWidth).toBe(mayWidth);
  });

  it("reserves at least the longest month-year label, measured in ch of the mono face", () => {
    renderPicker({
      month: "2026-05",
      importStartDates: ["2025-01-15"],
      onJump: vi.fn(),
    });
    const trigger = triggerFor(/May 2026/i);
    const style = getComputedStyle(trigger);

    const unquote = (family: string) => family.replace(/["']/g, "");
    expect(unquote(style.fontFamily)).toBe(
      unquote(theme.typography.fontFamily.mono)
    );
    expect(style.minWidth).toMatch(/^\d+(\.\d+)?ch$/);
    expect(parseFloat(style.minWidth)).toBeGreaterThanOrEqual(
      LONGEST_LABEL_CHARS
    );
  });

  it("centres the label in the trigger", () => {
    renderPicker({
      month: "2026-05",
      importStartDates: ["2025-01-15"],
      onJump: vi.fn(),
    });
    const trigger = triggerFor(/May 2026/i);
    const label = screen.getByText("May 2026");

    const centred =
      getComputedStyle(trigger).justifyContent === "center" ||
      getComputedStyle(label).textAlign === "center";
    expect(centred).toBe(true);
  });
});

// Issue #275, Audit Finding 19 — the trigger sits at the right of the page
// header, so the popover aligns its right edge to the trigger's right edge
// and stays inside the window instead of overflowing it.
describe("MonthYearPicker — popover placement", () => {
  it("anchors the popover's right edge to the trigger's right edge", () => {
    const innerWidth = window.innerWidth;
    Object.defineProperty(window, "innerWidth", {
      configurable: true,
      value: 1440,
    });
    try {
      renderPicker({
        month: "2023-06",
        importStartDates: ["2023-03-15"],
        onJump: vi.fn(),
      });
      const trigger = screen.getByRole("button", { name: /June 2023/i });
      vi.spyOn(trigger, "getBoundingClientRect").mockReturnValue({
        x: 1238.4,
        y: 60,
        left: 1238.4,
        right: 1392,
        top: 60,
        bottom: 92,
        width: 153.6,
        height: 32,
        toJSON: () => ({}),
      });

      openPicker();

      const popover = screen
        .getByRole("button", { name: "Mar" })
        .closest("[style]") as HTMLElement;
      expect(popover.style.top).toBe("100px");
      expect(popover.style.right).toBe("48px");
      expect(popover.style.left).toBe("");
    } finally {
      Object.defineProperty(window, "innerWidth", {
        configurable: true,
        value: innerWidth,
      });
    }
  });
});
