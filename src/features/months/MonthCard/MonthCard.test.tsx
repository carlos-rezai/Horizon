// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { ThemeProvider } from "styled-components";
import { MemoryRouter } from "react-router-dom";
import { theme } from "../../../tokens";
import MonthCard from "./MonthCard";

afterEach(() => {
  cleanup();
});

function renderMonthCard(month: string) {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <MonthCard month={month} />
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe("MonthCard", () => {
  it("renders the formatted month label", () => {
    renderMonthCard("2026-05");

    expect(screen.getByText("May 2026")).toBeInTheDocument();
  });

  it("renders a link to the month overview route", () => {
    renderMonthCard("2026-05");

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/months/2026-05");
  });
});
