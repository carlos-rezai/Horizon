// @vitest-environment jsdom
import { render, screen, cleanup, within } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../tokens";
import KpiStrip from "./KpiStrip";
import KpiStripSkeleton from "./KpiStripSkeleton";
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

  it("renders one tile each for Total Liquid, Restschuld, Net Cashflow, and To Payoff", () => {
    renderStrip();
    expect(screen.getByText("Total Liquid")).toBeInTheDocument();
    expect(screen.getByText("Restschuld")).toBeInTheDocument();
    expect(screen.getByText("Net Cashflow")).toBeInTheDocument();
    expect(screen.getByText("To Payoff")).toBeInTheDocument();
    expect(screen.getAllByTestId("kpi-tile")).toHaveLength(4);
  });
});

describe("KpiStrip — To Payoff", () => {
  it("shows years, months, and the debt-free month when the mortgage pays off", () => {
    // 5 months: positive Restschuld ramping to 0 at index 4 (payoff in month m4).
    const payoffSnapshots: MonthlySnapshot[] = [
      300000, 225000, 150000, 75000, 0,
    ].map((debt, i) => ({
      month: `2026-0${i + 1}`,
      accounts: { g1: { projected: 100000 }, m1: { projected: debt } },
      netCashflow: 5000,
      totalLiquid: 100000,
    }));

    renderStrip(payoffSnapshots);

    const payoff = tile("To Payoff");
    // 4 months → 0 years, 4 months
    expect(payoff).toHaveTextContent("Years");
    expect(payoff).toHaveTextContent("Months");
    expect(payoff).toHaveTextContent("debt-free in May 2026");
  });

  it("renders an honest empty state when there is no payoff in the horizon", () => {
    // No mortgage account → no Restschuld → no payoff.
    renderStrip(snapshots, [giroAccount]);
    expect(tile("To Payoff")).toHaveTextContent(/no payoff/i);
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

// --- Skeleton / content height parity (issue #208, Dashboard CLS) -----------
//
// The Dashboard's cold-load layout shift (CLS 0.05) was a single ~11px jolt: the
// KPI strip's value slot renders its numerals at a 30px / 1.5 line-box (45px),
// but the skeleton reserved only 34px, so the strip grew when the numbers
// landed and pushed every section below it down. The contract that removes the
// shift: the value slot reserves its real line-box height, identically in the
// skeleton and in the loaded content, so the strip is the same height from the
// first frame. jsdom does no layout, so this is verified through the declared
// height each state reserves on its value slot rather than a measured CLS.

function renderSkeleton() {
  return render(
    <ThemeProvider theme={theme}>
      <KpiStripSkeleton />
    </ThemeProvider>
  );
}

// The value line-box: 30px numerals at the global "normal" line-height. The
// font size is the one StyledValue sets; the line-height is the token the reset
// applies to the whole app.
const VALUE_FONT_SIZE = 30;
const expectedValueHeight = `${
  VALUE_FONT_SIZE * theme.typography.lineHeights.normal
}px`;

function valueSlotHeights(root: HTMLElement): string[] {
  return within(root)
    .getAllByTestId("kpi-value")
    .map((slot) => getComputedStyle(slot).height);
}

describe("KpiStrip — value-slot height parity", () => {
  it("reserves the same value-slot height in the skeleton as in the loaded content", () => {
    const content = renderStrip().container;
    const contentHeights = valueSlotHeights(content);
    cleanup();

    const skeleton = renderSkeleton().container;
    const skeletonHeights = valueSlotHeights(skeleton);

    expect(contentHeights.length).toBeGreaterThan(0);
    expect(skeletonHeights.length).toBeGreaterThan(0);
    // Every reserved value slot, in either state, is the same single height —
    // so nothing about the strip's height depends on whether data has landed.
    const allHeights = new Set([...contentHeights, ...skeletonHeights]);
    expect(allHeights.size).toBe(1);
  });

  it("reserves the value line-box height (30px numerals at 1.5), not a shorter placeholder", () => {
    const skeleton = renderSkeleton().container;
    for (const height of valueSlotHeights(skeleton)) {
      expect(height).toBe(expectedValueHeight);
    }
  });
});

describe("KpiStrip — forward delta", () => {
  it("shows a forward delta on the Total Liquid tile when the projection grows", () => {
    renderStrip();
    const delta = within(tile("Total Liquid")).getByTestId("delta");
    // A forward (up) delta renders the up-right arrow icon, not the down arrow.
    expect(delta.querySelector(".lucide-arrow-up-right")).not.toBeNull();
    expect(delta.querySelector(".lucide-arrow-down")).toBeNull();
  });

  it("renders no delta on the value-only Net Cashflow tile", () => {
    renderStrip();
    expect(within(tile("Net Cashflow")).queryByTestId("delta")).toBeNull();
  });
});
