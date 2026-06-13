// @vitest-environment jsdom
import { render, screen, cleanup, within } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../tokens";
import KpiStrip from "./KpiStrip";
import type { MonthlySnapshot } from "../../../types/projection";
import type { AccountWithBalance } from "../../../types/account";

afterEach(cleanup);

const giroAccount: AccountWithBalance = {
  id: "g1",
  kind: "Girokonto",
  name: "Main",
  openingBalance: 0,
  openingDate: "2026-01-01",
  balance: 0,
};

const mortgageAccount: AccountWithBalance = {
  id: "m1",
  kind: "Mortgage",
  name: "DSL Mortgage",
  openingBalance: 0,
  openingDate: "2026-01-01",
  balance: 0,
};

// 13 forward months: Total Liquid climbs (positive delta), Restschuld constant,
// Net Cashflow constant at +50,00 €. Month strings only need to be unique —
// the KPI derivation is index-ordered, not date-parsed.
const snapshots: MonthlySnapshot[] = Array.from({ length: 13 }, (_, i) => ({
  month: `m${i}`,
  accounts: {
    g1: { projected: 100000 + i * 10000 },
    m1: { projected: -10000000 },
  },
  netCashflow: 5000,
  totalLiquid: 100000 + i * 10000,
}));

function renderStrip(
  data: MonthlySnapshot[] = snapshots,
  accounts: AccountWithBalance[] = [giroAccount, mortgageAccount]
) {
  return render(
    <ThemeProvider theme={theme}>
      <KpiStrip snapshots={data} accounts={accounts} />
    </ThemeProvider>
  );
}

function tile(label: string): HTMLElement {
  return screen
    .getByText(label)
    .closest('[data-testid="kpi-tile"]') as HTMLElement;
}

describe("KpiStrip — tiles", () => {
  it("renders the strip container", () => {
    renderStrip();
    expect(screen.getByTestId("kpi-strip")).toBeInTheDocument();
  });

  it("renders one tile each for Total Liquid, Restschuld, and Net Cashflow", () => {
    renderStrip();
    expect(screen.getByText("Total Liquid")).toBeInTheDocument();
    expect(screen.getByText("Restschuld")).toBeInTheDocument();
    expect(screen.getByText("Net Cashflow")).toBeInTheDocument();
    expect(screen.getAllByTestId("kpi-tile")).toHaveLength(3);
  });
});

describe("KpiStrip — values", () => {
  it("shows the current-month Total Liquid value", () => {
    renderStrip();
    // current month (index 0) Total Liquid is 100000 cents = 1.000,00 €
    expect(within(tile("Total Liquid")).getByTestId("money")).toHaveTextContent(
      /1[.,]000/
    );
  });

  it("shows a money value in the Net Cashflow tile", () => {
    renderStrip();
    expect(
      within(tile("Net Cashflow")).getByTestId("money")
    ).toBeInTheDocument();
  });
});

describe("KpiStrip — forward delta", () => {
  it("shows a forward delta on the Total Liquid tile when the projection grows", () => {
    renderStrip();
    expect(within(tile("Total Liquid")).getByTestId("delta")).toHaveTextContent(
      "▲"
    );
  });

  it("renders no delta on the value-only Net Cashflow tile", () => {
    renderStrip();
    expect(within(tile("Net Cashflow")).queryByTestId("delta")).toBeNull();
  });
});
