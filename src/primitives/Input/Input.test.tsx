// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { ThemeProvider, StyleSheetManager } from "styled-components";
import { theme } from "../../tokens";
import Input from "./Input";

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

afterEach(() => {
  cleanup();
});

describe("Input — unit", () => {
  it("renders as a native input element", () => {
    renderWithTheme(<Input aria-label="Amount" />);
    const input = screen.getByRole("textbox", { name: "Amount" });
    expect(input.tagName.toLowerCase()).toBe("input");
  });

  it("forwards the aria-label attribute", () => {
    renderWithTheme(<Input aria-label="Account name" />);
    expect(
      screen.getByRole("textbox", { name: "Account name" })
    ).toBeInTheDocument();
  });

  it("forwards the disabled attribute", () => {
    renderWithTheme(<Input aria-label="Amount" disabled />);
    expect(screen.getByRole("textbox", { name: "Amount" })).toBeDisabled();
  });

  it("forwards the placeholder attribute", () => {
    renderWithTheme(<Input aria-label="Amount" placeholder="e.g. 1 000,00" />);
    expect(screen.getByPlaceholderText("e.g. 1 000,00")).toBeInTheDocument();
  });

  it("renders as a focusable element", () => {
    renderWithTheme(<Input aria-label="Amount" />);
    const input = screen.getByRole("textbox", { name: "Amount" });
    expect(input).not.toHaveAttribute("tabindex", "-1");
  });
});

describe("Input — interaction", () => {
  it("calls onChange when the value changes", () => {
    const onChange = vi.fn();
    renderWithTheme(<Input aria-label="Amount" onChange={onChange} />);
    fireEvent.change(screen.getByRole("textbox", { name: "Amount" }), {
      target: { value: "100" },
    });
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

function renderForCSS(ui: React.ReactElement) {
  return render(
    <StyleSheetManager disableCSSOMInjection>
      <ThemeProvider theme={theme}>{ui}</ThemeProvider>
    </StyleSheetManager>
  );
}

function getInjectedCSS(): string {
  return Array.from(document.querySelectorAll("style"))
    .map((el) => el.textContent ?? "")
    .join("\n");
}

describe("Input — styles", () => {
  it("uses surfaceContainerLowest as background color", () => {
    renderForCSS(<Input aria-label="Amount" />);
    expect(getInjectedCSS()).toContain(theme.colors.surfaceContainerLowest);
  });

  it("focus state includes a 3px ring box-shadow (#269 Field Chrome)", () => {
    renderForCSS(<Input aria-label="Amount" />);
    expect(getInjectedCSS()).toContain("0 0 0 3px");
  });
});

describe("Input — prefix (Phase 2)", () => {
  it("renders the prefix text alongside the input", () => {
    renderWithTheme(<Input prefix="€" aria-label="Amount" />);
    expect(screen.getByText("€")).toBeInTheDocument();
  });

  it("renders the prefix in the mono figure font", () => {
    renderForCSS(<Input prefix="€" aria-label="Amount" />);
    expect(getInjectedCSS()).toContain("IBM Plex Mono");
  });
});

// Issue #268 — Input takes the Button's `size` prop and renders at its
// Control Height.
describe("Input — Control Height", () => {
  const sizes = ["sm", "md", "lg"] as const;

  sizes.forEach((size) => {
    it(`renders size "${size}" at the ${size} Control Height`, () => {
      renderWithTheme(<Input aria-label="Amount" size={size} />);
      expect(
        getComputedStyle(screen.getByRole("textbox", { name: "Amount" })).height
      ).toBe(`${theme.sizing.control[size]}px`);
    });
  });

  it("renders at the md Control Height when no size is given", () => {
    renderWithTheme(<Input aria-label="Amount" />);
    expect(
      getComputedStyle(screen.getByRole("textbox", { name: "Amount" })).height
    ).toBe(`${theme.sizing.control.md}px`);
  });

  it("renders at its Control Height with a prefix too", () => {
    renderWithTheme(<Input aria-label="Amount" prefix="€" size="sm" />);
    expect(
      getComputedStyle(screen.getByRole("textbox", { name: "Amount" })).height
    ).toBe(`${theme.sizing.control.sm}px`);
  });
});

// Issue #269 — Input gains a trailing-icon slot (the DatePicker's calendar
// icon sits in it), and the icon never changes the field's height.
describe("Input — trailing icon", () => {
  it("renders the trailing icon alongside the field", () => {
    renderWithTheme(
      <Input
        aria-label="Date"
        trailingIcon={<svg data-testid="calendar-icon" />}
      />
    );
    expect(screen.getByRole("textbox", { name: "Date" })).toBeInTheDocument();
    expect(screen.getByTestId("calendar-icon")).toBeInTheDocument();
  });

  it("keeps the trailing icon out of the accessibility tree", () => {
    renderWithTheme(
      <Input
        aria-label="Date"
        trailingIcon={<svg data-testid="calendar-icon" />}
      />
    );
    expect(
      screen.getByTestId("calendar-icon").closest("[aria-hidden='true']")
    ).not.toBeNull();
  });

  const sizes = ["sm", "md", "lg"] as const;

  sizes.forEach((size) => {
    it(`renders size "${size}" at the ${size} Control Height with a trailing icon`, () => {
      renderWithTheme(
        <Input
          aria-label="Date"
          size={size}
          trailingIcon={<svg data-testid="calendar-icon" />}
        />
      );
      expect(
        getComputedStyle(screen.getByRole("textbox", { name: "Date" })).height
      ).toBe(`${theme.sizing.control[size]}px`);
    });
  });
});

// Issue #275, Audit Finding 11 — the prefix sits inside the field chrome, as
// the leading counterpart of the trailing-icon slot, so a prefixed field's box
// spans the same width as an unprefixed one in the same grid.
describe("Input — prefix inside the field", () => {
  it("renders the prefix in the same box as the input, not beside it", () => {
    renderWithTheme(<Input prefix="€" aria-label="Amount" />);
    const input = screen.getByRole("textbox", { name: "Amount" });
    const prefix = screen.getByText("€");
    expect(prefix.parentElement).toBe(input.parentElement);
    expect(getComputedStyle(prefix).position).toBe("absolute");
  });
});
