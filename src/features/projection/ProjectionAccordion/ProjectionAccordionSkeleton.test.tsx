// @vitest-environment jsdom
import { render, screen, cleanup, within } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../tokens";
import ProjectionAccordionSkeleton from "./ProjectionAccordionSkeleton";

afterEach(cleanup);

function renderSkeleton() {
  return render(
    <ThemeProvider theme={theme}>
      <ProjectionAccordionSkeleton />
    </ThemeProvider>
  );
}

/** The column header row — the element that holds the "Period" label. */
const columnHeader = () => screen.getByText("Period").parentElement!;

describe("ProjectionAccordionSkeleton — matches the Projection layout", () => {
  it('reads "Projection"', () => {
    renderSkeleton();

    expect(screen.getByText("Projection", { exact: true })).toBeInTheDocument();
    expect(screen.queryByText("Projection Accordion")).not.toBeInTheDocument();
  });

  it("heads Period · two placeholder accounts · Total Liquid · Restschuld", () => {
    renderSkeleton();

    const header = columnHeader();
    const cells = Array.from(header.children);
    const labels = cells.map((cell) => cell.textContent ?? "");
    const placeholderAt = (i: number) =>
      within(cells[i] as HTMLElement).queryAllByTestId("skeleton").length > 0;

    const period = labels.indexOf("Period");
    expect(period).toBeGreaterThanOrEqual(0);
    expect(placeholderAt(period + 1)).toBe(true);
    expect(placeholderAt(period + 2)).toBe(true);
    expect(labels[period + 3]).toBe("Total Liquid");
    expect(labels[period + 4]).toBe("Restschuld");
    expect(cells).toHaveLength(period + 5);

    // Every year row stands in a cell for every header column, so the card
    // does not reflow when the real rows land.
    const firstYearRow = header.nextElementSibling!.firstElementChild!;
    expect(firstYearRow.children).toHaveLength(cells.length);
  });

  it("has no Net Cashflow or Sondertilgung column", () => {
    renderSkeleton();

    expect(screen.queryByText("Net Cashflow")).not.toBeInTheDocument();
    expect(screen.queryByText("Sondertilgung")).not.toBeInTheDocument();
  });
});
