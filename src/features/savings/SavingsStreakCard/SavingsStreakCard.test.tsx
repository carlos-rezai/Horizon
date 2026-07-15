// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../tokens";
import SavingsStreakCard from "./SavingsStreakCard";
import type { SavingsGoal, YearTick } from "../savingsTypes";

afterEach(() => {
  cleanup();
});

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

/** Jan→Dec ticks: Feb/Mar met, Apr missed, everything else upcoming. */
function yearTicks(): YearTick[] {
  const status = (m: number): YearTick["status"] => {
    if (m === 1 || m === 2) return "met";
    if (m === 3) return "missed";
    return "upcoming";
  };
  return Array.from({ length: 12 }, (_, m) => ({
    year: 2026,
    month: m,
    status: status(m),
  }));
}

const GOAL: SavingsGoal = {
  mode: "manual",
  targetTotal: 0,
  targetDate: "2026-12",
  startedAt: "2026-01",
  manualMonthly: { a1: 10000 },
  monthly: { a1: 10000 },
  monthsToTarget: null,
  monthsElapsed: 2,
  perAccount: [
    {
      id: "a1",
      target: 10000,
      tracked: true,
      cumulativeActual: 20000,
      cumulativeTarget: 20000,
    },
  ],
  streak: { current: 2, best: 4, yearTicks: yearTicks() },
};

const EMPTY_GOAL: SavingsGoal = {
  mode: "manual",
  targetTotal: 0,
  targetDate: "2026-12",
  startedAt: "2026-01",
  manualMonthly: {},
  monthly: {},
  monthsToTarget: null,
  monthsElapsed: 0,
  perAccount: [],
  streak: { current: 0, best: 0, yearTicks: [] },
};

describe("SavingsStreakCard — collapsed", () => {
  it("renders the Savings Streak title and the flame icon", () => {
    const { container } = renderWithTheme(<SavingsStreakCard goal={GOAL} />);
    expect(screen.getByText(/Savings Streak/i)).toBeTruthy();
    expect(container.querySelector(".lucide-flame")).toBeTruthy();
  });

  it("shows the current streak as the most prominent figure", () => {
    renderWithTheme(<SavingsStreakCard goal={GOAL} />);
    expect(screen.getByText(/2\s*mo/i)).toBeTruthy();
  });

  it("shows the best-ever streak alongside the current one", () => {
    renderWithTheme(<SavingsStreakCard goal={GOAL} />);
    expect(screen.getByText(/best\s*4\s*mo/i)).toBeTruthy();
  });

  it("renders the Jan→Dec calendar strip", () => {
    renderWithTheme(<SavingsStreakCard goal={GOAL} />);
    expect(screen.getByText(/Jan/i)).toBeTruthy();
    expect(screen.getByText(/Dec/i)).toBeTruthy();
  });

  it("distinguishes met, missed, and upcoming months on the strip", () => {
    const { container } = renderWithTheme(<SavingsStreakCard goal={GOAL} />);
    // Each tile carries a tooltip describing that month's status.
    expect(container.querySelector('[title*="goal met"]')).toBeTruthy();
    expect(container.querySelector('[title*="goal missed"]')).toBeTruthy();
    expect(container.querySelector('[title*="upcoming"]')).toBeTruthy();
  });
});

describe("SavingsStreakCard — empty state", () => {
  it("shows an honest zero streak without error when there is no history", () => {
    expect(() =>
      renderWithTheme(<SavingsStreakCard goal={EMPTY_GOAL} />)
    ).not.toThrow();
    expect(screen.getByText(/Savings Streak/i)).toBeTruthy();
    expect(screen.getByText(/0\s*mo/i)).toBeTruthy();
  });
});
