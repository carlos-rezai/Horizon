// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { ThemeProvider, StyleSheetManager } from "styled-components";
import { theme } from "../../tokens";
import DataRow from "./DataRow";

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

describe("DataRow", () => {
  it("renders its children", () => {
    renderWithTheme(
      <DataRow columns={["1fr", "auto"]}>
        <span>Salary</span>
        <span>1.234,56 €</span>
      </DataRow>
    );
    expect(screen.getByText("Salary")).toBeInTheDocument();
    expect(screen.getByText("1.234,56 €")).toBeInTheDocument();
  });

  it("clamps every column track with minmax(0, …) so long values never blow out", () => {
    renderForCSS(
      <DataRow columns={["2fr", "auto"]}>
        <span>x</span>
        <span>y</span>
      </DataRow>
    );
    const css = getInjectedCSS();
    expect(css).toContain("minmax(0, 2fr)");
    expect(css).toContain("minmax(0, auto)");
  });

  it("calls onClick when the row is clicked", () => {
    const onClick = vi.fn();
    renderWithTheme(
      <DataRow columns={["1fr"]} onClick={onClick}>
        <span>Row</span>
      </DataRow>
    );
    fireEvent.click(screen.getByTestId("data-row"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("is clickable (pointer cursor) when it navigates as a link", () => {
    renderForCSS(
      <DataRow columns={["1fr"]} as="a" href="/accounts/1">
        <span>Row</span>
      </DataRow>
    );
    expect(getInjectedCSS()).toContain("cursor:pointer");
  });

  it("is not clickable (default cursor) when it is a plain row", () => {
    renderForCSS(
      <DataRow columns={["1fr"]}>
        <span>Row</span>
      </DataRow>
    );
    expect(getInjectedCSS()).toContain("cursor:default");
  });

  it("renders a hairline divider by default", () => {
    renderForCSS(
      <DataRow columns={["1fr"]}>
        <span>Row</span>
      </DataRow>
    );
    const css = getInjectedCSS();
    expect(css).toContain("border-bottom");
    expect(css).toContain("rgba(255,255,255,0.04)");
  });

  it("omits the divider on the last row", () => {
    renderForCSS(
      <DataRow columns={["1fr"]} last>
        <span>Row</span>
      </DataRow>
    );
    expect(getInjectedCSS()).toContain("border-bottom:none");
  });
});

describe("DataRow — export", () => {
  it("is importable from src/components/index.ts", async () => {
    const { DataRow: DataRowFromIndex } = await import("../index");
    expect(() =>
      renderWithTheme(
        <DataRowFromIndex columns={["1fr"]}>
          <span>x</span>
        </DataRowFromIndex>
      )
    ).not.toThrow();
  });
});
