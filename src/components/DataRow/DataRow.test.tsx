// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { ThemeProvider, StyleSheetManager } from "styled-components";
import { theme } from "../../tokens";
import DataRow from "./DataRow";
import Money from "../../primitives/Money/Money";
import { columnOf } from "../../testing/columnOf/columnOf";

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
      <DataRow columns={[{ width: "1fr" }, { width: "auto" }]}>
        <span>Salary</span>
        <span>1.234,56 €</span>
      </DataRow>
    );
    expect(screen.getByText("Salary")).toBeInTheDocument();
    expect(screen.getByText("1.234,56 €")).toBeInTheDocument();
  });

  it("clamps every column track with minmax(0, …) so long values never blow out", () => {
    renderForCSS(
      <DataRow columns={[{ width: "2fr" }, { width: "auto" }]}>
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
      <DataRow columns={[{ width: "1fr" }]} onClick={onClick}>
        <span>Row</span>
      </DataRow>
    );
    fireEvent.click(screen.getByTestId("data-row"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("is clickable (pointer cursor) when it navigates as a link", () => {
    renderForCSS(
      <DataRow columns={[{ width: "1fr" }]} as="a" href="/accounts/1">
        <span>Row</span>
      </DataRow>
    );
    expect(getInjectedCSS()).toContain("cursor:pointer");
  });

  it("is not clickable (default cursor) when it is a plain row", () => {
    renderForCSS(
      <DataRow columns={[{ width: "1fr" }]}>
        <span>Row</span>
      </DataRow>
    );
    expect(getInjectedCSS()).toContain("cursor:default");
  });

  it("renders a hairline divider by default", () => {
    renderForCSS(
      <DataRow columns={[{ width: "1fr" }]}>
        <span>Row</span>
      </DataRow>
    );
    const css = getInjectedCSS();
    expect(css).toContain("border-bottom");
    expect(css).toContain("rgba(255,255,255,0.04)");
  });

  it("omits the divider on the last row", () => {
    renderForCSS(
      <DataRow columns={[{ width: "1fr" }]} last>
        <span>Row</span>
      </DataRow>
    );
    expect(getInjectedCSS()).toContain("border-bottom:none");
  });
});

// Issue #274 — DataRow reads each column's alignment from the shared column
// definition, so a figure in an end-aligned column right-aligns without the
// feature styling its cell.
describe("DataRow — column alignment", () => {
  it("right-aligns a figure in an end-aligned column", () => {
    renderWithTheme(
      <DataRow columns={[{ width: "1fr" }, { width: "120px", align: "end" }]}>
        <span>Salary</span>
        <Money cents={250000} />
      </DataRow>
    );
    expect(columnOf(screen.getByTestId("money"))?.align).toBe("end");
  });

  it("right-aligns whatever cell sits in an end-aligned column", () => {
    renderWithTheme(
      <DataRow
        columns={[
          { width: "1fr" },
          { width: "120px", align: "end" },
          { width: "80px" },
        ]}
      >
        <span>Salary</span>
        <span>Monthly</span>
        <span>Edit</span>
      </DataRow>
    );
    expect(columnOf(screen.getByText("Monthly"))?.align).toBe("end");
    expect(columnOf(screen.getByText("Edit"))?.align).toBe("start");
  });
});

describe("DataRow — export", () => {
  it("is importable from src/components/index.ts", async () => {
    const { DataRow: DataRowFromIndex } = await import("../index");
    expect(() =>
      renderWithTheme(
        <DataRowFromIndex columns={[{ width: "1fr" }]}>
          <span>x</span>
        </DataRowFromIndex>
      )
    ).not.toThrow();
  });
});
