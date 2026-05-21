// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../tokens";
import TableHeader from "./TableHeader";

afterEach(cleanup);

function renderHeader(columns: string[], gridTemplate = "1fr 120px 100px") {
  return render(
    <ThemeProvider theme={theme}>
      <TableHeader columns={columns} gridTemplate={gridTemplate} />
    </ThemeProvider>
  );
}

describe("TableHeader", () => {
  it("renders each column label", () => {
    renderHeader(["Name", "Amount", "Frequency"]);

    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Amount")).toBeInTheDocument();
    expect(screen.getByText("Frequency")).toBeInTheDocument();
  });

  it("renders the correct number of cells", () => {
    renderHeader(["Name", "Amount"]);

    expect(screen.getAllByText(/name|amount/i)).toHaveLength(2);
  });
});
