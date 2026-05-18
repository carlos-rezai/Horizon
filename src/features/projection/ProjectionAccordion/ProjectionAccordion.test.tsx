// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { ThemeProvider } from "styled-components";
import { MemoryRouter } from "react-router-dom";
import { theme } from "../../../tokens";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

import ProjectionAccordion from "./ProjectionAccordion";
import type { MonthlySnapshot } from "../../../types/projection";
import type { AccountWithBalance } from "../../../types/account";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderWithTheme(ui: React.ReactElement) {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>{ui}</MemoryRouter>
    </ThemeProvider>
  );
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

describe("ProjectionAccordion — month row navigation", () => {
  it("clicking a month row navigates to the correct /months/YYYY-MM route", () => {
    renderWithTheme(
      <ProjectionAccordion
        snapshots={snapshotsWithPayoff}
        accounts={[giroAccount]}
        initialYear={2026}
      />
    );

    fireEvent.click(screen.getByText("Oct 2026").closest("tr")!);

    expect(mockNavigate).toHaveBeenCalledWith("/months/2026-10");
  });

  it("each month row navigates to its own route", () => {
    renderWithTheme(
      <ProjectionAccordion
        snapshots={snapshotsWithPayoff}
        accounts={[giroAccount]}
        initialYear={2026}
      />
    );

    fireEvent.click(screen.getByText("Nov 2026").closest("tr")!);
    expect(mockNavigate).toHaveBeenCalledWith("/months/2026-11");

    fireEvent.click(screen.getByText("Dec 2026").closest("tr")!);
    expect(mockNavigate).toHaveBeenCalledWith("/months/2026-12");
  });
});
