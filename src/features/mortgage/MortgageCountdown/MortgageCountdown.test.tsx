// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../tokens";
import MortgageCountdown from "./MortgageCountdown";
import Button from "../../../primitives/Button/Button";

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}
import type { MonthlySnapshot } from "../../../types/projection";
import type { AccountWithBalance } from "../../../types/account";
import type { RecurringTransaction } from "../../../types/recurring";

afterEach(() => {
  cleanup();
});

const mortgageAccount: AccountWithBalance = {
  id: "mortgage-1",
  kind: "Mortgage",
  name: "Berliner Darlehen",
  anchorBalance: 4000000,
  anchorDate: "2026-01-01",
  balance: 3800000,
};

const assetAccount: AccountWithBalance = {
  id: "giro-1",
  kind: "Girokonto",
  name: "Main",
  anchorBalance: 100000,
  anchorDate: "2026-01-01",
  balance: 150000,
};

// A monthly repayment transfer from the Girokonto into the mortgage.
const repayment: RecurringTransaction = {
  id: "rec-repay",
  accountId: "giro-1",
  amount: 150000,
  description: "Darlehensrate",
  category: "Housing",
  frequency: "monthly",
  dayOfMonth: 1,
  linkedAccountId: "mortgage-1",
};

const NO_REPAYMENT_FOOTER =
  "No repayment set up — add a recurring transfer into this mortgage to see the payoff date.";

function makeSnapshots(
  accountId: string,
  finalProjected: number
): MonthlySnapshot[] {
  return Array.from({ length: 120 }, (_, i) => {
    const year = 2026 + Math.floor(i / 12);
    const month = String((i % 12) + 1).padStart(2, "0");
    const projected = i < 119 ? 4000000 - i * 10000 : finalProjected;
    return {
      month: `${year}-${month}`,
      accounts: { [accountId]: { projected } },
      netCashflow: 0,
      totalLiquid: 0,
    };
  });
}

describe("MortgageCountdown", () => {
  // Live-Use Repair #2 (issue #226): a fresh install no longer hides the card —
  // it shows the shared EmptyState with a way into Mortgage Setup.
  describe("with zero Mortgage accounts", () => {
    function renderEmpty() {
      return renderWithTheme(
        <MortgageCountdown
          accounts={[assetAccount]}
          snapshots={[]}
          recurringTransactions={[]}
        />
      );
    }

    it("renders the card with its usual section head", () => {
      renderEmpty();
      expect(screen.getByText("Mortgage Countdown")).toBeInTheDocument();
    });

    it("renders the empty state's title and hint", () => {
      renderEmpty();
      expect(screen.getByText("No mortgage yet")).toBeInTheDocument();
      expect(
        screen.getByText(
          "Add your mortgage to see what's paid off and when it's done."
        )
      ).toBeInTheDocument();
    });

    it("offers a Set up mortgage button", () => {
      renderEmpty();
      expect(
        screen.getByRole("button", { name: "Set up mortgage" })
      ).toBeInTheDocument();
    });

    it("opens the Mortgage Setup modal when the button is clicked", () => {
      renderEmpty();
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

      fireEvent.click(screen.getByRole("button", { name: "Set up mortgage" }));

      expect(screen.getByRole("dialog")).toBeInTheDocument();
      expect(screen.getByLabelText(/restschuld today/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/original principal/i)).toBeInTheDocument();
    });
  });

  it("renders one card per Mortgage account labelled by account name", () => {
    const secondMortgage: AccountWithBalance = {
      ...mortgageAccount,
      id: "mortgage-2",
      name: "Zweites Darlehen",
    };
    const snapshots = makeSnapshots("mortgage-1", 100000);

    renderWithTheme(
      <MortgageCountdown
        accounts={[mortgageAccount, secondMortgage]}
        snapshots={snapshots}
        recurringTransactions={[repayment]}
      />
    );

    expect(screen.getByText("Berliner Darlehen")).toBeInTheDocument();
    expect(screen.getByText("Zweites Darlehen")).toBeInTheDocument();
  });

  it("shows the current Restschuld for each Mortgage account", () => {
    const snapshots = makeSnapshots("mortgage-1", 100000);

    renderWithTheme(
      <MortgageCountdown
        accounts={[mortgageAccount]}
        snapshots={snapshots}
        recurringTransactions={[repayment]}
      />
    );

    // balance 3800000 cents = 38,000.00 € — some formatted form containing 38.000 or 38,000
    expect(screen.getByText(/38[.,]000/)).toBeInTheDocument();
  });

  it('shows "Not paid off within 10-year horizon." when a repayment exists but payoff falls beyond the horizon', () => {
    const snapshots = makeSnapshots("mortgage-1", 100000); // never reaches 0

    renderWithTheme(
      <MortgageCountdown
        accounts={[mortgageAccount]}
        snapshots={snapshots}
        recurringTransactions={[repayment]}
      />
    );

    expect(
      screen.getByText("Not paid off within 10-year horizon.")
    ).toBeInTheDocument();
  });

  it("renders a progress bar for each mortgage account", () => {
    const snapshots = makeSnapshots("mortgage-1", 100000);

    renderWithTheme(
      <MortgageCountdown
        accounts={[mortgageAccount]}
        snapshots={snapshots}
        recurringTransactions={[repayment]}
      />
    );

    expect(screen.getByRole("progressbar")).toBeInTheDocument();
  });

  it("progress bar exposes aria-valuenow and aria-valuemax", () => {
    const snapshots = makeSnapshots("mortgage-1", 100000);

    renderWithTheme(
      <MortgageCountdown
        accounts={[mortgageAccount]}
        snapshots={snapshots}
        recurringTransactions={[repayment]}
      />
    );

    const bar = screen.getByRole("progressbar");
    expect(bar).toHaveAttribute("aria-valuenow");
    expect(bar).toHaveAttribute("aria-valuemax");
  });

  it("shows the To Payoff countdown and payoff date when payoff month is found", () => {
    // Build snapshots where balance reaches 0 partway through
    const snapshots: MonthlySnapshot[] = Array.from({ length: 120 }, (_, i) => {
      const year = 2026 + Math.floor(i / 12);
      const month = String((i % 12) + 1).padStart(2, "0");
      return {
        month: `${year}-${month}`,
        accounts: {
          "mortgage-1": { projected: i < 60 ? 4000000 - i * 70000 : -1 },
        },
        netCashflow: 0,
        totalLiquid: 0,
      };
    });

    renderWithTheme(
      <MortgageCountdown
        accounts={[mortgageAccount]}
        snapshots={snapshots}
        recurringTransactions={[repayment]}
      />
    );

    expect(screen.getByText("To Payoff")).toBeInTheDocument();
    // The countdown renders year/month units.
    expect(screen.getByText("yr")).toBeInTheDocument();
    expect(screen.getByText("mo")).toBeInTheDocument();
  });

  it("renders the Paid off label and an edit button", () => {
    const snapshots = makeSnapshots("mortgage-1", 100000);

    renderWithTheme(
      <MortgageCountdown
        accounts={[mortgageAccount]}
        snapshots={snapshots}
        recurringTransactions={[repayment]}
      />
    );

    expect(screen.getByText("Paid off")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Edit mortgage details" })
    ).toBeInTheDocument();
  });

  it("shows the no-repayment footer when no recurring transfer pays the mortgage", () => {
    const snapshots = makeSnapshots("mortgage-1", 100000);

    renderWithTheme(
      <MortgageCountdown
        accounts={[mortgageAccount, assetAccount]}
        snapshots={snapshots}
        recurringTransactions={[]}
      />
    );

    expect(screen.getByText(NO_REPAYMENT_FOOTER)).toBeInTheDocument();
    expect(
      screen.queryByText("Not paid off within 10-year horizon.")
    ).not.toBeInTheDocument();
  });

  it("shows the no-repayment footer when recurrings exist but none is linked to the mortgage", () => {
    const snapshots = makeSnapshots("mortgage-1", 100000);
    const salary: RecurringTransaction = {
      id: "rec-salary",
      accountId: "giro-1",
      amount: 300000,
      description: "Gehalt",
      category: "Income",
      frequency: "monthly",
      dayOfMonth: 25,
    };

    renderWithTheme(
      <MortgageCountdown
        accounts={[mortgageAccount, assetAccount]}
        snapshots={snapshots}
        recurringTransactions={[salary]}
      />
    );

    expect(screen.getByText(NO_REPAYMENT_FOOTER)).toBeInTheDocument();
  });
});

/**
 * A reference Button in the given ghost variant, small, icon-only. Matching
 * its generated classes proves a control is that Button — one Control Height
 * sm, one hover, one focus ring — rather than a hand-sized look-alike.
 */
function referenceIconButtonClass(
  variant: "ghost" | "ghostDanger" = "ghost"
): string {
  const { getByRole, unmount } = render(
    <ThemeProvider theme={theme}>
      <Button
        variant={variant}
        size="sm"
        icon="Pencil"
        aria-label="Reference"
      />
    </ThemeProvider>
  );
  const className = getByRole("button", { name: "Reference" }).className;
  unmount();
  return className;
}

/** An icon-only control: an svg glyph and no visible text. */
function expectIconOnly(el: HTMLElement) {
  expect(el.querySelector("svg")).toBeInTheDocument();
  expect(el.textContent).toBe("");
}

// Issue #272 — feature icon buttons onto Button.
describe("MortgageCountdown — edit is the shared icon button", () => {
  it("renders the edit pencil as the ghost, small, icon-only Button, keeping its handler", () => {
    renderWithTheme(
      <MortgageCountdown
        accounts={[mortgageAccount]}
        snapshots={makeSnapshots("mortgage-1", 100000)}
        recurringTransactions={[repayment]}
      />
    );
    const edit = screen.getByRole("button", { name: "Edit mortgage details" });

    expect(edit.className).toBe(referenceIconButtonClass());
    expectIconOnly(edit);

    fireEvent.click(edit);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });
});
