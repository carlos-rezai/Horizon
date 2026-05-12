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

  it("focus state includes a 2px ring box-shadow", () => {
    renderForCSS(<Input aria-label="Amount" />);
    expect(getInjectedCSS()).toContain("0 0 0 2px");
  });
});
