// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../tokens";
import Select from "./Select";

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

afterEach(() => {
  cleanup();
});

describe("Select — unit", () => {
  it("renders as a native select element", () => {
    renderWithTheme(
      <Select aria-label="Account kind">
        <option value="Girokonto">Girokonto</option>
      </Select>
    );
    const select = screen.getByRole("combobox", { name: "Account kind" });
    expect(select.tagName.toLowerCase()).toBe("select");
  });

  it("forwards the aria-label attribute", () => {
    renderWithTheme(
      <Select aria-label="Account kind">
        <option value="Girokonto">Girokonto</option>
      </Select>
    );
    expect(
      screen.getByRole("combobox", { name: "Account kind" })
    ).toBeInTheDocument();
  });

  it("forwards the disabled attribute", () => {
    renderWithTheme(
      <Select aria-label="Account kind" disabled>
        <option value="Girokonto">Girokonto</option>
      </Select>
    );
    expect(
      screen.getByRole("combobox", { name: "Account kind" })
    ).toBeDisabled();
  });

  it("renders as a focusable element", () => {
    renderWithTheme(
      <Select aria-label="Account kind">
        <option value="Girokonto">Girokonto</option>
      </Select>
    );
    const select = screen.getByRole("combobox", { name: "Account kind" });
    expect(select).not.toHaveAttribute("tabindex", "-1");
  });
});

describe("Select — interaction", () => {
  it("calls onChange when the selection changes", () => {
    const onChange = vi.fn();
    renderWithTheme(
      <Select aria-label="Account kind" onChange={onChange}>
        <option value="Girokonto">Girokonto</option>
        <option value="Tagesgeld">Tagesgeld</option>
      </Select>
    );
    fireEvent.change(screen.getByRole("combobox", { name: "Account kind" }), {
      target: { value: "Tagesgeld" },
    });
    expect(onChange).toHaveBeenCalledTimes(1);
  });
});

// Issue #268 — Select takes the Button's `size` prop and renders at its
// Control Height.
describe("Select — Control Height", () => {
  const sizes = ["sm", "md", "lg"] as const;

  sizes.forEach((size) => {
    it(`renders size "${size}" at the ${size} Control Height`, () => {
      renderWithTheme(
        <Select aria-label="Account kind" size={size}>
          <option value="Girokonto">Girokonto</option>
        </Select>
      );
      expect(
        getComputedStyle(screen.getByRole("combobox", { name: "Account kind" }))
          .height
      ).toBe(`${theme.sizing.control[size]}px`);
    });
  });

  // A select with `appearance: none` does not centre its text the way an
  // input does: vertical padding eats the content box and clips the line.
  sizes.forEach((size) => {
    it(`fits one line of text inside the content box at size "${size}"`, () => {
      renderWithTheme(
        <Select aria-label="Account kind" size={size}>
          <option value="Girokonto">Girokonto</option>
        </Select>
      );
      const cs = getComputedStyle(
        screen.getByRole("combobox", { name: "Account kind" })
      );
      const contentBox =
        theme.sizing.control[size] -
        2 -
        (parseFloat(cs.paddingTop) || 0) -
        (parseFloat(cs.paddingBottom) || 0);
      const lineHeight =
        theme.typography.sizes.sm * Number(theme.typography.lineHeights.normal);
      expect(contentBox).toBeGreaterThanOrEqual(lineHeight);
    });
  });

  it("renders at the md Control Height when no size is given", () => {
    renderWithTheme(
      <Select aria-label="Account kind">
        <option value="Girokonto">Girokonto</option>
      </Select>
    );
    expect(
      getComputedStyle(screen.getByRole("combobox", { name: "Account kind" }))
        .height
    ).toBe(`${theme.sizing.control.md}px`);
  });
});
