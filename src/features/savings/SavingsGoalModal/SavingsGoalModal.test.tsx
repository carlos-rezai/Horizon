// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../tokens";
import SavingsGoalModal from "./SavingsGoalModal";
import type { SavingsGoalConfig } from "../savingsTypes";
import type { AccountWithBalance } from "../../../types/account";
import type { HistoryPoint } from "../../history/historyTypes";

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
    // Every account input defaults to 0.00 — never a blank or broken form.
    for (const account of ACCOUNTS) {
      expect(
        screen.getByLabelText(`${account.name} monthly target`)
      ).toHaveValue("0.00");
    }
  });

  it("keeps the Milestone fields mounted in Manual mode so the dialog height stays fixed", () => {
    renderWithTheme(
      <SavingsGoalModal
        config={CONFIG}
        accounts={ACCOUNTS}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );
    // CONFIG opens in Manual. The Milestone target inputs stay in the DOM
    // (hidden) so their height is reserved and switching modes never resizes
    // the dialog. querySelector is used because they are aria-hidden here.
    expect(document.querySelector('[aria-label="Target amount"]')).toBeTruthy();
    expect(document.querySelector('[aria-label="Target month"]')).toBeTruthy();
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

// ---------------------------------------------------------------------------
// SavingsGoalModal — Milestone mode (Phase 4). The user enters one total target
// amount and one target month; the modal derives the per-account split live via
// the ported `computeSavingsGoal` weighting (trailing-12-month positive gain,
// Math.max(avg, 100) floor) and shows it read-only in the same row list Manual
// mode uses. Editing any row silently converts the goal to Manual, pre-filled
// with the derived split. Deriving the split needs the reconstructed history,
// so these tests pass `points`.
// ---------------------------------------------------------------------------

/**
 * Four months → three deltas. Main and Sparkasse each gain €100/mo; ETF gains
 * €200/mo. Trailing weights 10000 : 10000 : 20000 (sum 40000). "Today" is the
 * last point (2026-04); a target 12 months out makes monthsToTarget = 12.
 */
const POINTS: HistoryPoint[] = [
  {
    month: "2026-01",
    totalLiquid: 0,
    restschuld: 0,
    netCashflow: 0,
    accounts: { "a-main": 0, "a-spar": 0, "a-etf": 0 },
  },
  {
    month: "2026-02",
    totalLiquid: 40000,
    restschuld: 0,
    netCashflow: 0,
    accounts: { "a-main": 10000, "a-spar": 10000, "a-etf": 20000 },
  },
  {
    month: "2026-03",
    totalLiquid: 80000,
    restschuld: 0,
    netCashflow: 0,
    accounts: { "a-main": 20000, "a-spar": 20000, "a-etf": 40000 },
  },
  {
    month: "2026-04",
    totalLiquid: 120000,
    restschuld: 0,
    netCashflow: 0,
    accounts: { "a-main": 30000, "a-spar": 30000, "a-etf": 60000 },
  },
];

/**
 * A milestone goal: €4,800 by 2027-04. requiredMonthly = 480000 / 12 = 40000,
 * split 1:1:2 → Main €100, Sparkasse €100, ETF €200.
 */
const MILESTONE_CONFIG: SavingsGoalConfig = {
  mode: "milestone",
  targetTotal: 480000,
  targetDate: "2027-04",
  startedAt: "2026-01",
  manualMonthly: {},
};

describe("SavingsGoalModal — Milestone mode", () => {
  it("reveals a target-amount and a target-month input when Milestone is chosen", () => {
    renderWithTheme(
      <SavingsGoalModal
        config={CONFIG}
        accounts={ACCOUNTS}
        points={POINTS}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /milestone/i }));

    expect(screen.getByLabelText(/target amount/i)).toBeTruthy();
    expect(screen.getByLabelText(/target month/i)).toBeTruthy();
  });

  it("shows the derived per-account split live, read-only, in the shared row list", () => {
    renderWithTheme(
      <SavingsGoalModal
        config={MILESTONE_CONFIG}
        accounts={ACCOUNTS}
        points={POINTS}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );

    // ETF is weighted double → €200; Main and Sparkasse each €100.
    expect(screen.getByDisplayValue("200.00")).toBeTruthy();
    expect(screen.getAllByDisplayValue("100.00")).toHaveLength(2);
  });

  it("describes the split as weighted by recent savings pace, not by balance", () => {
    renderWithTheme(
      <SavingsGoalModal
        config={MILESTONE_CONFIG}
        accounts={ACCOUNTS}
        points={POINTS}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );

    expect(screen.getByText(/recent savings pace/i)).toBeTruthy();
    expect(screen.queryByText(/by balance/i)).toBeNull();
  });

  it("silently converts to Manual when a row is edited, pre-filled with the split", () => {
    renderWithTheme(
      <SavingsGoalModal
        config={MILESTONE_CONFIG}
        accounts={ACCOUNTS}
        points={POINTS}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );

    // Override ETF's derived €200 with €250.
    fireEvent.change(screen.getByDisplayValue("200.00"), {
      target: { value: "250.00" },
    });

    // The goal is now Manual…
    expect(
      screen.getByRole("button", { name: /manual/i, pressed: true })
    ).toBeTruthy();
    // …and the other two rows keep their derived €100 (nothing discarded).
    expect(screen.getAllByDisplayValue("100.00")).toHaveLength(2);
    expect(screen.getByDisplayValue("250.00")).toBeTruthy();
  });

  it("preserves manual edits when toggling to Milestone and back to Manual", () => {
    renderWithTheme(
      <SavingsGoalModal
        config={CONFIG}
        accounts={ACCOUNTS}
        points={POINTS}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );

    // In Manual, raise the ETF target from 500.00 € to 600.00 €.
    fireEvent.change(screen.getByDisplayValue("500.00"), {
      target: { value: "600.00" },
    });

    // Flip to Milestone (the row now shows the auto-split) and back to Manual.
    fireEvent.click(screen.getByRole("button", { name: /milestone/i }));
    fireEvent.click(screen.getByRole("button", { name: /manual/i }));

    // The manual edit survives the round-trip — nothing is re-seeded over it.
    expect(screen.getByDisplayValue("600.00")).toBeTruthy();
  });

  it("seeds Manual from the auto-split on first entry, then keeps later edits across toggles", () => {
    renderWithTheme(
      <SavingsGoalModal
        config={MILESTONE_CONFIG}
        accounts={ACCOUNTS}
        points={POINTS}
        onClose={vi.fn()}
        onSave={vi.fn()}
      />
    );

    // A goal that opened in Milestone is pristine: first Manual entry adopts the
    // derived split (100 / 100 / 200) as the editable baseline.
    fireEvent.click(screen.getByRole("button", { name: /manual/i }));
    expect(screen.getByDisplayValue("200.00")).toBeTruthy();
    expect(screen.getAllByDisplayValue("100.00")).toHaveLength(2);

    // Override ETF to 250, then flip Milestone → Manual: the edit is kept, not
    // re-seeded back to the split's 200.
    fireEvent.change(screen.getByDisplayValue("200.00"), {
      target: { value: "250.00" },
    });
    fireEvent.click(screen.getByRole("button", { name: /milestone/i }));
    fireEvent.click(screen.getByRole("button", { name: /manual/i }));
    expect(screen.getByDisplayValue("250.00")).toBeTruthy();
  });

  it("saves a milestone config with the total in cents and an empty manual split", () => {
    const onSave = vi.fn();
    renderWithTheme(
      <SavingsGoalModal
        config={MILESTONE_CONFIG}
        accounts={ACCOUNTS}
        points={POINTS}
        onClose={vi.fn()}
        onSave={onSave}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /save changes/i }));

    expect(onSave).toHaveBeenCalledTimes(1);
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        mode: "milestone",
        targetTotal: 480000,
        targetDate: "2027-04",
        manualMonthly: {},
      })
    );
  });
});
