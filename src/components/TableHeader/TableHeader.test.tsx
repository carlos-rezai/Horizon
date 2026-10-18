// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../tokens";
import TableHeader from "./TableHeader";
import DataRow from "../DataRow/DataRow";
import Money from "../../primitives/Money/Money";
import type { TableColumn } from "../index";
import { columnOf } from "../../testing/columnOf/columnOf";

afterEach(cleanup);

// Issue #274 — alignment has one owner. A table's columns are defined once:
// each column's width, its heading and its alignment. TableHeader and DataRow
// both read that one definition, so a heading and the figures under it cannot
// disagree.
const COLUMNS: TableColumn[] = [
  { label: "Name", width: "1fr" },
  { label: "Frequency", width: "120px" },
  { label: "Amount", width: "100px", align: "end" },
];

function renderHeader(columns: TableColumn[] = COLUMNS) {
  return render(
    <ThemeProvider theme={theme}>
      <TableHeader columns={columns} />
    </ThemeProvider>
  );
}

describe("TableHeader", () => {
  it("renders each column label", () => {
    renderHeader();

    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Amount")).toBeInTheDocument();
    expect(screen.getByText("Frequency")).toBeInTheDocument();
  });

  it("renders one heading per column", () => {
    renderHeader(COLUMNS.slice(0, 2));

    expect(screen.getAllByText(/name|frequency/i)).toHaveLength(2);
  });

  it("right-aligns the heading of an end-aligned column", () => {
    renderHeader();

    expect(columnOf(screen.getByText("Amount"))?.align).toBe("end");
  });

  it("starts the heading of a column with no alignment", () => {
    renderHeader();

    expect(columnOf(screen.getByText("Name"))?.align).toBe("start");
  });
});

describe("TableHeader and DataRow — one column definition", () => {
  function renderTable() {
    return render(
      <ThemeProvider theme={theme}>
        <TableHeader columns={COLUMNS} />
        <DataRow columns={COLUMNS}>
          <span>Salary</span>
          <span>Monthly</span>
          <Money cents={250000} />
        </DataRow>
      </ThemeProvider>
    );
  }

  it("puts a heading and its figure in the same column of the same grid", () => {
    renderTable();

    const heading = columnOf(screen.getByText("Amount"));
    const figure = columnOf(screen.getByTestId("money"));

    expect(heading).not.toBeNull();
    expect(figure).toEqual(heading);
  });

  it("aligns every heading with the cells under it", () => {
    renderTable();

    const row = screen.getByTestId("data-row");
    ["Name", "Frequency", "Amount"].forEach((label, i) => {
      const heading = columnOf(screen.getByText(label));
      expect(columnOf(row.children[i])).toEqual(heading);
    });
  });
});
