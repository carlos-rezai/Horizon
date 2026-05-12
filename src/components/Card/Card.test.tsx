// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { ThemeProvider, StyleSheetManager } from "styled-components";
import { theme } from "../../tokens";
import Card from "./Card";

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

afterEach(() => {
  cleanup();
});

describe("Card — unit", () => {
  it("renders children inside a surface container", () => {
    renderWithTheme(<Card>Account summary</Card>);
    expect(screen.getByText("Account summary")).toBeInTheDocument();
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

describe("Card — styles", () => {
  it("has a top-stroke inner highlight applied via inset box-shadow", () => {
    renderForCSS(<Card>Test</Card>);
    expect(getInjectedCSS()).toContain("inset");
  });
});
