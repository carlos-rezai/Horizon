// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../tokens";
import type { MonthStats } from "../../../utils/monthStats/monthStats";
import MonthStatStrip from "./MonthStatStrip";

const stats: MonthStats = {
  variableSpending: -77616,
  ofWhichCat: -12320,
  entries: 12,
  avgPerDay: -2772,
};

function renderStrip(s: MonthStats = stats) {
  return render(
    <ThemeProvider theme={theme}>
      <MonthStatStrip stats={s} />
    </ThemeProvider>
  );
}

afterEach(cleanup);

describe("MonthStatStrip", () => {
  it("renders all four stat labels", () => {
    renderStrip();
    expect(screen.getByText("Variable Spending")).toBeInTheDocument();
    expect(screen.getByText("Of which Cat")).toBeInTheDocument();
    expect(screen.getByText("Entries")).toBeInTheDocument();
    expect(screen.getByText("Avg / day")).toBeInTheDocument();
  });

  it("renders the entry count as a plain number", () => {
    renderStrip();
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("renders the variable spending total as currency", () => {
    renderStrip();
    expect(screen.getByText(/776[.,]16/)).toBeInTheDocument();
  });

  it("renders the of-which-Cat subtotal as currency", () => {
    renderStrip();
    expect(screen.getByText(/123[.,]20/)).toBeInTheDocument();
  });

  it("renders the avg/day figure as currency", () => {
    renderStrip();
    expect(screen.getByText(/27[.,]72/)).toBeInTheDocument();
  });
});
