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
