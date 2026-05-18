// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { ThemeProvider } from "styled-components";
import { MemoryRouter } from "react-router-dom";
import { theme } from "../../../tokens";
import ProjectionAccordion from "./ProjectionAccordion";
import type { MonthlySnapshot } from "../../../types/projection";
import type { AccountWithBalance } from "../../../types/account";

afterEach(() => {
  cleanup();
});

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

const mortgageAccount: AccountWithBalance = {
  id: "m1",
  kind: "Mortgage",
  name: "DSL Mortgage",
  openingBalance: 0,
  openingDate: "2026-01-01",
  balance: 0,
};

const giroAccount: AccountWithBalance = {
  id: "g1",
  kind: "Girokonto",
  name: "Main",
  openingBalance: 0,
  openingDate: "2026-01-01",
  balance: 0,
};

// Mortgage reaches zero at 2027-01
const snapshotsWithPayoff: MonthlySnapshot[] = [
  {
    month: "2026-10",
    accounts: { m1: { projected: 50000 }, g1: { projected: 200000 } },
    netCashflow: 0,
    totalLiquid: 200000,
  },
  {
    month: "2026-11",
    accounts: { m1: { projected: 25000 }, g1: { projected: 200000 } },
    netCashflow: 0,
    totalLiquid: 200000,
  },
  {
    month: "2026-12",
    accounts: { m1: { projected: 10000 }, g1: { projected: 200000 } },
    netCashflow: 0,
    totalLiquid: 200000,
  },
  {
    month: "2027-01",
    accounts: { m1: { projected: 0 }, g1: { projected: 200000 } },
    netCashflow: 0,
    totalLiquid: 200000,
  },
  {
    month: "2027-02",
    accounts: { m1: { projected: 0 }, g1: { projected: 200000 } },
    netCashflow: 0,
    totalLiquid: 200000,
  },
  {
    month: "2027-03",
    accounts: { m1: { projected: 0 }, g1: { projected: 200000 } },
    netCashflow: 0,
    totalLiquid: 200000,
  },
];

// Mortgage never reaches zero
const snapshotsNoPayoff: MonthlySnapshot[] = snapshotsWithPayoff.map((s) => ({
  ...s,
  accounts: { ...s.accounts, m1: { projected: 50000 } },
}));

describe("ProjectionAccordion — payoff month row", () => {
  it("marks the payoff month row with data-testid when the payoff year is expanded", () => {
    renderWithTheme(
      <ProjectionAccordion
        snapshots={snapshotsWithPayoff}
        accounts={[mortgageAccount, giroAccount]}
        initialYear={2027}
      />
    );

    expect(screen.getByTestId("payoff-month-row")).toBeInTheDocument();
  });

  it("marks only the payoff month row — not subsequent zero-restschuld rows in the same year", () => {
    renderWithTheme(
      <ProjectionAccordion
        snapshots={snapshotsWithPayoff}
        accounts={[mortgageAccount, giroAccount]}
        initialYear={2027}
      />
    );

    expect(screen.getAllByTestId("payoff-month-row")).toHaveLength(1);
  });

  it("does not mark any row when no Mortgage account is provided", () => {
    renderWithTheme(
      <ProjectionAccordion
        snapshots={snapshotsWithPayoff}
        accounts={[giroAccount]}
        initialYear={2027}
      />
    );

    expect(screen.queryByTestId("payoff-month-row")).not.toBeInTheDocument();
  });

  it("does not mark any row when the mortgage never reaches zero", () => {
    renderWithTheme(
      <ProjectionAccordion
        snapshots={snapshotsNoPayoff}
        accounts={[mortgageAccount, giroAccount]}
        initialYear={2027}
      />
    );

    expect(screen.queryByTestId("payoff-month-row")).not.toBeInTheDocument();
  });
});

describe("ProjectionAccordion — month cell links", () => {
  it("renders each month cell as a link when the year is expanded", () => {
    render(
      <ThemeProvider theme={theme}>
        <MemoryRouter>
          <ProjectionAccordion
            snapshots={snapshotsWithPayoff}
            accounts={[giroAccount]}
            initialYear={2026}
          />
        </MemoryRouter>
      </ThemeProvider>
    );

    const links = screen.getAllByRole("link");
    expect(links.length).toBeGreaterThan(0);
  });

  it("each month cell link points to the correct /months/YYYY-MM route", () => {
    render(
      <ThemeProvider theme={theme}>
        <MemoryRouter>
          <ProjectionAccordion
            snapshots={snapshotsWithPayoff}
            accounts={[giroAccount]}
            initialYear={2026}
          />
        </MemoryRouter>
      </ThemeProvider>
    );

    const links = screen.getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href"));
    expect(hrefs).toContain("/months/2026-10");
    expect(hrefs).toContain("/months/2026-11");
    expect(hrefs).toContain("/months/2026-12");
  });
});
