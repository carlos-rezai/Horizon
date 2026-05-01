// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../tokens";
import MortgageCountdown from "./MortgageCountdown";

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}
import type { MonthlySnapshot } from "../../../types/projection";
import type { AccountWithBalance } from "../../../types/account";

afterEach(() => {
  cleanup();
});

const mortgageAccount: AccountWithBalance = {
  id: "mortgage-1",
  kind: "Mortgage",
  name: "Berliner Darlehen",
  openingBalance: 4000000,
  openingDate: "2026-01-01",
  balance: 3800000,
};

const assetAccount: AccountWithBalance = {
  id: "giro-1",
  kind: "Girokonto",
  name: "Main",
  openingBalance: 100000,
  openingDate: "2026-01-01",
  balance: 150000,
};

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
  it("renders nothing when no Mortgage accounts exist", () => {
    const { container } = renderWithTheme(
      <MortgageCountdown accounts={[assetAccount]} snapshots={[]} />
    );
    expect(container.firstChild).toBeNull();
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
      />
    );

    expect(screen.getByText("Berliner Darlehen")).toBeInTheDocument();
    expect(screen.getByText("Zweites Darlehen")).toBeInTheDocument();
  });

  it("shows the current Restschuld for each Mortgage account", () => {
    const snapshots = makeSnapshots("mortgage-1", 100000);

    renderWithTheme(
      <MortgageCountdown accounts={[mortgageAccount]} snapshots={snapshots} />
    );

    // balance 3800000 cents = 38,000.00 € — some formatted form containing 38.000 or 38,000
    expect(screen.getByText(/38[.,]000/)).toBeInTheDocument();
  });

  it('shows "Not paid off within 10-year horizon." when payoff month is null', () => {
    const snapshots = makeSnapshots("mortgage-1", 100000); // never reaches 0

    renderWithTheme(
      <MortgageCountdown accounts={[mortgageAccount]} snapshots={snapshots} />
    );

    expect(
      screen.getByText("Not paid off within 10-year horizon.")
    ).toBeInTheDocument();
  });

  it("shows time remaining when payoff month is found", () => {
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
      <MortgageCountdown accounts={[mortgageAccount]} snapshots={snapshots} />
    );

    expect(
      screen.getByText(/\d+ years?.*\d+ months?.*remaining/i)
    ).toBeInTheDocument();
  });
});
