// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../tokens";
import YearComparison from "./YearComparison";

function renderCard(monthLabel = "June") {
  return render(
    <ThemeProvider theme={theme}>
      <YearComparison monthLabel={monthLabel} />
    </ThemeProvider>
  );
}

afterEach(cleanup);

describe("YearComparison", () => {
  it("renders the Year comparison / This year so far headings", () => {
    renderCard();
    expect(screen.getByText("Year comparison")).toBeInTheDocument();
    expect(screen.getByText("This year so far")).toBeInTheDocument();
  });

  it("marks the feature as Planned", () => {
    renderCard();
    expect(screen.getByText("Planned")).toBeInTheDocument();
  });

  it("frames the comparison with the month label", () => {
    renderCard("June");
    expect(screen.getByText(/Jan 1 through June/i)).toBeInTheDocument();
  });

  it("is an honest placeholder with a coming-soon note", () => {
    renderCard();
    expect(screen.getByText(/coming soon/i)).toBeInTheDocument();
  });
});
