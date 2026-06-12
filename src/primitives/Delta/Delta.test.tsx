// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { ThemeProvider, StyleSheetManager } from "styled-components";
import { theme } from "../../tokens";
import Delta from "./Delta";

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

describe("Delta — display", () => {
  it("renders the percentage rounded to one decimal with a % suffix", () => {
    renderWithTheme(<Delta value={12.34} />);
    const text = screen.getByTestId("delta").textContent ?? "";
    expect(text).toContain("12,3");
    expect(text).toContain("%");
  });

  it("renders the absolute value for a negative delta (direction is shown, not a minus)", () => {
    renderWithTheme(<Delta value={-8.5} />);
    const text = screen.getByTestId("delta").textContent ?? "";
    expect(text).toContain("8,5");
    expect(text).not.toContain("-8");
  });

  it("treats zero as a non-negative (up) delta and renders 0", () => {
    renderWithTheme(<Delta value={0} />);
    expect(screen.getByTestId("delta").textContent).toContain("0");
  });

  it("uses the supplied suffix instead of the default %", () => {
    renderWithTheme(<Delta value={3.2} suffix="pp" />);
    const text = screen.getByTestId("delta").textContent ?? "";
    expect(text).toContain("pp");
    expect(text).not.toContain("%");
  });
});

describe("Delta — direction colour", () => {
  it("colours a non-negative delta with the gain (secondary) tone", () => {
    renderForCSS(<Delta value={0} />);
    expect(getInjectedCSS()).toContain(theme.colors.secondary);
  });

  it("colours a negative delta with the loss (error) tone", () => {
    renderForCSS(<Delta value={-4.1} />);
    expect(getInjectedCSS()).toContain(theme.colors.error);
  });

  it("treats a tiny negative that rounds to 0 as a loss (sign-flip edge)", () => {
    renderForCSS(<Delta value={-0.04} />);
    // Rounds to "0" in the label but the direction is still down → loss tone.
    expect(getInjectedCSS()).toContain(theme.colors.error);
  });
});

describe("Delta — export", () => {
  it("is importable from src/primitives/index.ts", async () => {
    const { Delta: DeltaFromIndex } = await import("../index");
    expect(() => renderWithTheme(<DeltaFromIndex value={1} />)).not.toThrow();
  });
});
