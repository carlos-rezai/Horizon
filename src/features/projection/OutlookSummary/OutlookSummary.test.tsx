// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../tokens";
import OutlookSummary from "./OutlookSummary";
import type { MonthlySnapshot } from "../../../types/projection";
import type { AccountWithBalance } from "../../../types/account";
import type { RecurringTransaction } from "../../../types/recurring";

afterEach(cleanup);

const giro: AccountWithBalance = {
  id: "g1",
  kind: "Girokonto",
  name: "Main",
  anchorBalance: 0,
  anchorDate: "2026-01-01",
  balance: 0,
};

const mortgage: AccountWithBalance = {
  id: "m1",
  kind: "Mortgage",
  name: "Mortgage",
  anchorBalance: 900000,
  anchorDate: "2026-01-01",
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

function transfer(
  id: string,
  amount: number,
  frequency: RecurringTransaction["frequency"],
  monthOfYear?: number
): RecurringTransaction {
  return {
    id,
    accountId: "g1",
    amount,
    description: id,
    category: "Housing",
    frequency,
    dayOfMonth: 1,
    linkedAccountId: "m1",
    monthOfYear,
  };
}

/**
 * Monthly snapshots from October 2026: the Restschuld falls by `monthly`
 * every month and by `annual` more each November, never below zero.
 */
function simulate(
  start: number,
  monthly: number,
  annual: number,
  monthCount: number
): MonthlySnapshot[] {
  const snapshots: MonthlySnapshot[] = [];
  let restschuld = start;
  for (let i = 0; i < monthCount; i++) {
    const year = 2026 + Math.floor((9 + i) / 12);
    const monthNum = ((9 + i) % 12) + 1;
    if (i > 0) {
      restschuld -= monthly;
      if (monthNum === 11) restschuld -= annual;
      restschuld = Math.max(0, restschuld);
    }
    snapshots.push(
      snap(`${year}-${String(monthNum).padStart(2, "0")}`, 0, restschuld)
    );
  }
  return snapshots;
}

function renderSummary(
  snapshots: MonthlySnapshot[],
  recurringTransactions: RecurringTransaction[] = [],
  accounts = [giro, mortgage]
) {
  return render(
    <ThemeProvider theme={theme}>
      <OutlookSummary
        snapshots={snapshots}
        accounts={accounts}
        recurringTransactions={recurringTransactions}
      />
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

  it("shows the debt-free month", () => {
    const snapshots = [
      snap("2026-01", 100000, 900000),
      snap("2026-10", 120000, 720000),
      snap("2027-10", 500000, 0),
    ];
    renderSummary(snapshots);

    expect(screen.getByText("Oct 2027")).toBeInTheDocument();
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

describe("OutlookSummary — Total Sondertilgung", () => {
  it("counts no Sondertilgung for a monthly-only repayment", () => {
    // The Restschuld falls every month, but there is no annual transfer.
    const snapshots = simulate(500000, 10000, 0, 24);
    renderSummary(snapshots, [transfer("Darlehen", 10000, "monthly")]);

    expect(screen.getByText(/^0 annual payments/)).toBeInTheDocument();
  });

  it("excludes monthly repayments and years after payoff", () => {
    // €25,000 Restschuld, €100/month and €20,000 each November: November 2026
    // pays €20,000 in full; November 2027 is capped at the €3,800 left the
    // month before and pays the loan off; November 2028 is after payoff.
    const snapshots = simulate(2500000, 10000, 2000000, 27);
    renderSummary(snapshots, [
      transfer("Darlehen", 10000, "monthly"),
      transfer("Sondertilgung", 2000000, "annual", 11),
    ]);

    expect(screen.getByText(/^2 annual payments/)).toBeInTheDocument();
    expect(screen.getByText(/-23\.800,00/)).toBeInTheDocument();
  });

  it("reads −€32,500 over 5 payments for the real-world reference case", () => {
    // €955/month and €6,500 each November from €89,500 in October 2026 —
    // paid off in October 2031.
    const snapshots = simulate(8950000, 95500, 650000, 240);
    renderSummary(snapshots, [
      transfer("Darlehen", 95500, "monthly"),
      transfer("Sondertilgung", 650000, "annual", 11),
    ]);

    expect(screen.getByText("Oct 2031")).toBeInTheDocument();
    expect(screen.getByText(/^5 annual payments/)).toBeInTheDocument();
    expect(screen.getByText(/-32\.500,00/)).toBeInTheDocument();
  });
});
