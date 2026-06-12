// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { ThemeProvider, StyleSheetManager } from "styled-components";
import { theme } from "../../tokens";
import StatBlock from "./StatBlock";

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

describe("StatBlock", () => {
  it("renders its label and value", () => {
    renderWithTheme(
      <StatBlock label="Total Liquid">
        <span>12.345,00 €</span>
      </StatBlock>
    );
    expect(screen.getByText("Total Liquid")).toBeInTheDocument();
    expect(screen.getByText("12.345,00 €")).toBeInTheDocument();
  });

  it("renders a hint when one is provided", () => {
    renderWithTheme(
      <StatBlock label="Total Liquid" hint="across all accounts">
        <span>12.345,00 €</span>
      </StatBlock>
    );
    expect(screen.getByText("across all accounts")).toBeInTheDocument();
  });

  it("does not render a hint when none is provided", () => {
    renderWithTheme(
      <StatBlock label="Total Liquid">
        <span>12.345,00 €</span>
      </StatBlock>
    );
    expect(screen.queryByText("across all accounts")).not.toBeInTheDocument();
  });

  it("right-aligns its contents when align is 'right'", () => {
    renderForCSS(
      <StatBlock label="Restschuld" align="right">
        <span>250.000,00 €</span>
      </StatBlock>
    );
    expect(getInjectedCSS()).toContain("text-align: right");
  });
});

describe("StatBlock — export", () => {
  it("is importable from src/components/index.ts", async () => {
    const { StatBlock: StatBlockFromIndex } = await import("../index");
    expect(() =>
      renderWithTheme(
        <StatBlockFromIndex label="Total Liquid">
          <span>0,00 €</span>
        </StatBlockFromIndex>
      )
    ).not.toThrow();
  });
});
