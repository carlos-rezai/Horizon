// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../tokens";
import OutlookSummary from "./OutlookSummary";
import type { MonthlySnapshot } from "../../../types/projection";
import type { AccountWithBalance } from "../../../types/account";

afterEach(cleanup);

const mortgage: AccountWithBalance = {
  id: "m1",
  kind: "Mortgage",
  name: "Mortgage",
  openingBalance: 900000,
  openingDate: "2026-01-01",
  balance: 900000,
};

function snap(
  month: string,
  totalLiquid: number,
  restschuld: number
): MonthlySnapshot {
  return {
    month,
    accounts: { m1: { projected: restschuld } },
    netCashflow: 0,
    totalLiquid,
  };
}

function renderSummary(snapshots: MonthlySnapshot[], accounts = [mortgage]) {
  return render(
    <ThemeProvider theme={theme}>
      <OutlookSummary snapshots={snapshots} accounts={accounts} />
    </ThemeProvider>
  );
}

describe("OutlookSummary", () => {
  it("renders the three summary stat labels", () => {
    renderSummary([snap("2026-01", 100000, 900000)]);
    expect(screen.getByText(/Total Liquid · 2026/)).toBeInTheDocument();
    expect(screen.getByText("Debt-free")).toBeInTheDocument();
    expect(screen.getByText("Total Sondertilgung")).toBeInTheDocument();
  });

  it("shows the debt-free month and ST payment count", () => {
    const snapshots = [
      snap("2026-01", 100000, 900000),
      snap("2026-10", 120000, 720000),
      snap("2027-10", 500000, 0),
    ];
    renderSummary(snapshots);

    expect(screen.getByText("Oct 2027")).toBeInTheDocument();
    // Two step-downs → 2 annual payments
    expect(screen.getByText(/2 annual payments/)).toBeInTheDocument();
  });

  it("renders an honest empty debt-free value when the mortgage never pays off", () => {
    renderSummary([
      snap("2026-01", 100000, 900000),
      snap("2027-01", 120000, 850000),
    ]);
    expect(screen.getByText("Debt-free")).toBeInTheDocument();
    // No real month — an em-dash placeholder stands in.
    expect(screen.getByText("—")).toBeInTheDocument();
  });
});
