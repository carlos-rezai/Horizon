// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../tokens";
import SavingsGoalModal from "./SavingsGoalModal";
import type { SavingsGoalConfig } from "../savingsTypes";
import type { AccountWithBalance } from "../../../types/account";

// ---------------------------------------------------------------------------
// SavingsGoalModal — Manual mode (Phase 3). The editor lists every trackable
// account as a direct euro input, pre-filled from the saved config. Values are
// entered in euros and returned to `onSave` as integer cents. `startedAt` is
// server-owned and never surfaced here. Milestone mode, the live derived split,
// and convert-on-edit are Phase 4 and out of scope for these tests.
// ---------------------------------------------------------------------------

afterEach(() => {
  cleanup();
});

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

/** The trackable accounts, in sort order, exactly as the card would pass them. */
const ACCOUNTS: AccountWithBalance[] = [
  {
    id: "a-main",
    kind: "Girokonto",
    name: "Main",
    openingBalance: 0,
    openingDate: "2026-01-01",
    showInTrajectory: true,
    balance: 248055,
  },
  {
    id: "a-spar",
    kind: "Girokonto",
    name: "Sparkasse",
    openingBalance: 0,
    openingDate: "2026-01-01",
    showInTrajectory: true,
    balance: 64020,
  },
  {
    id: "a-etf",
    kind: "Investment",
    name: "ETF Portfolio",
    openingBalance: 0,
    openingDate: "2026-01-01",
    showInTrajectory: true,
    balance: 376620,
  },
];

const CONFIG: SavingsGoalConfig = {
  mode: "manual",
  targetTotal: 0,
  targetDate: "2026-12",
  startedAt: "2026-01",
  manualMonthly: { "a-spar": 800, "a-etf": 50000 },
};

/** A never-saved goal: default config with no per-account targets. */
const EMPTY_CONFIG: SavingsGoalConfig = {
  mode: "manual",
  targetTotal: 0,
  targetDate: "2026-12",
  startedAt: "2026-01",
  manualMonthly: {},
};

describe("SavingsGoalModal — Manual mode", () => {
  it("renders the editor titled 'Edit savings goal'", () => {
    renderWithTheme(
      <SavingsGoalModal
        config={CONFIG}
        accounts={ACCOUNTS}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );
    expect(screen.getByText(/edit savings goal/i)).toBeTruthy();
  });

  it("offers a Milestone/Manual mode toggle", () => {
    renderWithTheme(
      <SavingsGoalModal
        config={CONFIG}
        accounts={ACCOUNTS}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );
    expect(screen.getByRole("button", { name: /milestone/i })).toBeTruthy();
    expect(screen.getByRole("button", { name: /manual/i })).toBeTruthy();
  });

  it("renders one euro input per trackable account, pre-filled in euros", () => {
    renderWithTheme(
      <SavingsGoalModal
        config={CONFIG}
        accounts={ACCOUNTS}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );
    // Every trackable account is named and editable.
    expect(screen.getByText("Main")).toBeTruthy();
    expect(screen.getByText("Sparkasse")).toBeTruthy();
    expect(screen.getByText("ETF Portfolio")).toBeTruthy();
    // Cents in config surface as euros in the inputs.
    expect(screen.getByDisplayValue("8.00")).toBeTruthy(); // 800 cents
    expect(screen.getByDisplayValue("500.00")).toBeTruthy(); // 50000 cents
    // Main has no target → shows 0.00 rather than disappearing.
    expect(screen.getAllByDisplayValue("0.00").length).toBeGreaterThanOrEqual(
      1
    );
  });

  it("shows sensible 0.00 defaults when no goal has ever been saved", () => {
    expect(() =>
      renderWithTheme(
        <SavingsGoalModal
          config={EMPTY_CONFIG}
          accounts={ACCOUNTS}
          onClose={vi.fn()}
          onSave={vi.fn()}
        />
      )
    ).not.toThrow();
    // All three accounts default to 0.00 — never a blank or broken form.
    expect(screen.getAllByDisplayValue("0.00")).toHaveLength(3);
  });

  it("saves per-account targets as integer cents", () => {
    const onSave = vi.fn();
    renderWithTheme(
      <SavingsGoalModal
        config={CONFIG}
        accounts={ACCOUNTS}
        onClose={vi.fn()}
        onSave={onSave}
      />
    );

    // Raise the ETF target from 500.00 € to 600.00 €.
    fireEvent.change(screen.getByDisplayValue("500.00"), {
      target: { value: "600.00" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "manual",
        manualMonthly: { "a-main": 0, "a-spar": 800, "a-etf": 60000 },
      })
    );
  });

  it("closes without saving when Cancel is clicked", () => {
    const onSave = vi.fn();
    const onClose = vi.fn();
    renderWithTheme(
      <SavingsGoalModal
        config={CONFIG}
        accounts={ACCOUNTS}
        onClose={onClose}
        onSave={onSave}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /cancel/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
  });
});
