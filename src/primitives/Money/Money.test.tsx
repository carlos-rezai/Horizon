// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { ThemeProvider, StyleSheetManager } from "styled-components";
import { theme } from "../../tokens";
import Money from "./Money";

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

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

afterEach(() => {
  cleanup();
});

describe("Money — formatting", () => {
  it("renders zero cents as a de-DE euro amount", () => {
    renderWithTheme(<Money cents={0} />);
    const el = screen.getByTestId("money");
    expect(el.textContent).toContain("0,00");
    expect(el.textContent).toContain("€");
  });

  it("renders a negative amount with a leading minus and grouped thousands", () => {
    renderWithTheme(<Money cents={-123456} />);
    // -123456 cents → -1.234,56 €
    expect(screen.getByTestId("money").textContent).toContain("-1.234,56");
  });

  it("groups large values with de-DE thousands separators", () => {
    renderWithTheme(<Money cents={123456789} />);
    // 123456789 cents → 1.234.567,89 €
    expect(screen.getByTestId("money").textContent).toContain("1.234.567,89");
  });

  it("prefixes an explicit + for positive values when sign is set", () => {
    renderWithTheme(<Money cents={50000} sign />);
    const text = screen.getByTestId("money").textContent ?? "";
    expect(text.trim().startsWith("+")).toBe(true);
    expect(text).toContain("500,00");
  });

  it("does not prefix a + for zero when sign is set", () => {
    renderWithTheme(<Money cents={0} sign />);
    expect(screen.getByTestId("money").textContent).not.toContain("+");
  });
});

describe("Money — styles", () => {
  it("renders in a tabular figure style so columns align", () => {
    renderForCSS(<Money cents={1000} />);
    expect(getInjectedCSS()).toContain("tabular-nums");
  });

  it("colours a positive value with the gain (secondary) tone when sign is set", () => {
    renderForCSS(<Money cents={50000} sign />);
    expect(getInjectedCSS()).toContain(theme.colors.secondary);
  });

  it("colours a negative value with the loss (error) tone when sign is set", () => {
    renderForCSS(<Money cents={-50000} sign />);
    expect(getInjectedCSS()).toContain(theme.colors.error);
  });
});

describe("Money — export", () => {
  it("is importable from src/primitives/index.ts", async () => {
    const { Money: MoneyFromIndex } = await import("../index");
    expect(() => renderWithTheme(<MoneyFromIndex cents={0} />)).not.toThrow();
  });
});
