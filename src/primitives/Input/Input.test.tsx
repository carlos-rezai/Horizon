// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { ThemeProvider } from "styled-components";
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
