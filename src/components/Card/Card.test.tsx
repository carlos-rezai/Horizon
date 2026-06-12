// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
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

describe("Card — accent rail", () => {
  it("renders an accent rail when an accent colour is provided", () => {
    renderWithTheme(<Card accent="#E6B559">Test</Card>);
    expect(screen.getByTestId("card-accent")).toBeInTheDocument();
  });

  it("tints the accent rail with the provided colour", () => {
    renderForCSS(<Card accent="#E6B559">Test</Card>);
    expect(getInjectedCSS()).toContain("#E6B559");
  });

  it("does not render an accent rail by default", () => {
    renderWithTheme(<Card>Test</Card>);
    expect(screen.queryByTestId("card-accent")).not.toBeInTheDocument();
  });
});

describe("Card — interaction", () => {
  it("calls onClick when a clickable card is clicked", () => {
    const onClick = vi.fn();
    renderWithTheme(<Card onClick={onClick}>Test</Card>);
    fireEvent.click(screen.getByTestId("card"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });
});
