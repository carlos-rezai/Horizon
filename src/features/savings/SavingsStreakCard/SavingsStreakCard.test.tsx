// @vitest-environment jsdom
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../tokens";
import SnackbarProvider from "../../../components/SnackbarProvider/SnackbarProvider";
import SavingsStreakCard from "./SavingsStreakCard";
import type { SavingsGoal, YearTick } from "../savingsTypes";
import type { AccountWithBalance } from "../../../types/account";

afterEach(() => {
  cleanup();
});

function renderWithTheme(ui: React.ReactElement) {
  return render(
    <ThemeProvider theme={theme}>
      <SnackbarProvider>{ui}</SnackbarProvider>
    </ThemeProvider>
  );
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

/**
 * Three trackable accounts in `sortOrder`: Main (untracked), Sparkasse
 * (tracked), ETF Portfolio (tracked) — mirrors the expanded-card screen.
 */
const ACCOUNTS: AccountWithBalance[] = [
  {
    id: "a-main",
    kind: "Girokonto",
    name: "Main",
    openingBalance: 0,
    openingDate: "2026-01-01",
    balance: 248055,
  },
  {
    id: "a-spar",
    kind: "Girokonto",
    name: "Sparkasse",
    openingBalance: 0,
    openingDate: "2026-01-01",
    balance: 64020,
  },
  {
    id: "a-etf",
    kind: "Investment",
    name: "ETF Portfolio",
    openingBalance: 0,
    openingDate: "2026-01-01",
    balance: 376620,
  },
];

const GOAL: SavingsGoal = {
  mode: "manual",
  targetTotal: 0,
  targetDate: "2026-12",
  startedAt: "2026-01",
  manualMonthly: { "a-spar": 800, "a-etf": 50000 },
  monthly: { "a-main": 0, "a-spar": 800, "a-etf": 50000 },
  monthsToTarget: null,
  monthsElapsed: 6,
  perAccount: [
    {
      id: "a-main",
      target: 0,
      tracked: false,
      cumulativeActual: 0,
      cumulativeTarget: 0,
    },
    {
      id: "a-spar",
      target: 800,
      tracked: true,
      cumulativeActual: 8400, // 84,00 €
      cumulativeTarget: 4800, // 48,00 €
    },
    {
      id: "a-etf",
      target: 50000,
      tracked: true,
      cumulativeActual: 376620,
      cumulativeTarget: 300000,
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

/** Click the card's expand/collapse chevron control. */
function toggleControl(): HTMLElement {
  return screen.getByRole("button", { name: /expand|collapse/i });
}

describe("SavingsStreakCard — collapsed", () => {
  it("renders the Savings Streak title and the flame icon", () => {
    const { container } = renderWithTheme(
      <SavingsStreakCard goal={GOAL} accounts={ACCOUNTS} />
    );
    expect(screen.getByText(/Savings Streak/i)).toBeTruthy();
    expect(container.querySelector(".lucide-flame")).toBeTruthy();
  });

  it("shows the current streak as the most prominent figure", () => {
    renderWithTheme(<SavingsStreakCard goal={GOAL} accounts={ACCOUNTS} />);
    expect(screen.getByText(/2\s*mo/i)).toBeTruthy();
  });

  it("shows the best-ever streak alongside the current one", () => {
    renderWithTheme(<SavingsStreakCard goal={GOAL} accounts={ACCOUNTS} />);
    expect(screen.getByText(/best\s*4\s*mo/i)).toBeTruthy();
  });

  it("renders the Jan→Dec calendar strip", () => {
    renderWithTheme(<SavingsStreakCard goal={GOAL} accounts={ACCOUNTS} />);
    expect(screen.getByText(/Jan/i)).toBeTruthy();
    expect(screen.getByText(/Dec/i)).toBeTruthy();
  });

  it("distinguishes met, missed, and upcoming months on the strip", () => {
    const { container } = renderWithTheme(
      <SavingsStreakCard goal={GOAL} accounts={ACCOUNTS} />
    );
    // Each tile carries a tooltip describing that month's status.
    expect(container.querySelector('[title*="goal met"]')).toBeTruthy();
    expect(container.querySelector('[title*="goal missed"]')).toBeTruthy();
    expect(container.querySelector('[title*="upcoming"]')).toBeTruthy();
  });
});

describe("SavingsStreakCard — empty state", () => {
  it("shows an honest zero streak without error when there is no history", () => {
    expect(() =>
      renderWithTheme(<SavingsStreakCard goal={EMPTY_GOAL} accounts={[]} />)
    ).not.toThrow();
    expect(screen.getByText(/Savings Streak/i)).toBeTruthy();
    expect(screen.getByText(/0\s*mo/i)).toBeTruthy();
  });
});

describe("SavingsStreakCard — expand / collapse", () => {
  it("is collapsed by default: no per-account rows are shown", () => {
    renderWithTheme(<SavingsStreakCard goal={GOAL} accounts={ACCOUNTS} />);
    // The account rows only exist in the expanded body.
    expect(screen.queryByText("Sparkasse")).toBeNull();
    expect(screen.queryByText("ETF Portfolio")).toBeNull();
  });

  it("expands when the card body is clicked, then collapses on a second click", () => {
    renderWithTheme(<SavingsStreakCard goal={GOAL} accounts={ACCOUNTS} />);

    // Clicking the card header region toggles the accordion.
    fireEvent.click(screen.getByText(/Savings Streak/i));
    expect(screen.getByText("Sparkasse")).toBeTruthy();

    fireEvent.click(screen.getByText(/Savings Streak/i));
    expect(screen.queryByText("Sparkasse")).toBeNull();
  });

  it("expands when the chevron control is clicked", () => {
    renderWithTheme(<SavingsStreakCard goal={GOAL} accounts={ACCOUNTS} />);

    fireEvent.click(toggleControl());
    expect(screen.getByText("Sparkasse")).toBeTruthy();
  });
});

describe("SavingsStreakCard — expanded rows", () => {
  function renderExpanded() {
    const result = renderWithTheme(
      <SavingsStreakCard goal={GOAL} accounts={ACCOUNTS} />
    );
    fireEvent.click(toggleControl());
    return result;
  }

  it("renders one row per trackable account, in perAccount order", () => {
    renderExpanded();
    const names = screen
      .getAllByText(/Main|Sparkasse|ETF Portfolio/)
      .map((el) => el.textContent);
    expect(names).toEqual(["Main", "Sparkasse", "ETF Portfolio"]);
  });

  it("shows an avatar for every row and a progress bar for each tracked row", () => {
    renderExpanded();
    // One avatar per account row (3), one progress bar per tracked row (2).
    expect(screen.getAllByTestId("avatar")).toHaveLength(3);
    expect(screen.getAllByRole("progressbar")).toHaveLength(2);
  });

  it("shows the cumulative saved, cumulative target, and monthly target for a tracked row", () => {
    renderExpanded();
    // Sparkasse: 84,00 € saved of 48,00 € target, 8 €/mo.
    expect(screen.getByText(/84,00/)).toBeTruthy();
    expect(screen.getByText(/48,00/)).toBeTruthy();
    // Both tracked rows (Sparkasse, ETF) show a "/mo" monthly-target label.
    expect(screen.getAllByText(/\/\s*mo/i).length).toBeGreaterThan(0);
  });

  it("renders an untracked account dimmed with a 'Not tracked' badge, not hidden", () => {
    renderExpanded();
    // Main has a 0/mo target — present, badged, not dropped.
    expect(screen.getByText("Main")).toBeTruthy();
    expect(screen.getByText(/not tracked/i)).toBeTruthy();
  });
});

describe("SavingsStreakCard — edit affordance", () => {
  it("opens the goal editor from a top-right pencil, same gesture as Mortgage Countdown", () => {
    renderWithTheme(
      <SavingsStreakCard goal={GOAL} accounts={ACCOUNTS} onSave={vi.fn()} />
    );

    // The editor is closed until the pencil is pressed.
    expect(screen.queryByText(/edit savings goal/i)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /edit savings goal/i }));

    expect(screen.getByText(/edit savings goal/i)).toBeTruthy();
  });

  it("saves through the editor and confirms with a success snackbar", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    renderWithTheme(
      <SavingsStreakCard goal={GOAL} accounts={ACCOUNTS} onSave={onSave} />
    );

    fireEvent.click(screen.getByRole("button", { name: /edit savings goal/i }));
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    await waitFor(() => expect(onSave).toHaveBeenCalledTimes(1));
    expect(await screen.findByText(/savings goal updated/i)).toBeTruthy();
  });
});
