// @vitest-environment jsdom
import {
  render,
  screen,
  cleanup,
  fireEvent,
  within,
} from "@testing-library/react";
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
import type { RecurringTransaction } from "../../../types/recurring";
import { chartColors } from "../../../tokens/colors";

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

describe("ProjectionAccordion — deep-link expand & scroll", () => {
  it("expands only the deep-linked year, leaving other years collapsed", () => {
    renderWithTheme(
      <ProjectionAccordion
        snapshots={snapshotsWithPayoff}
        accounts={[giroAccount, mortgageAccount]}
        initialYear={2027}
      />
    );

    const header2027 = document
      .getElementById("year-2027")!
      .querySelector("button")!;
    const header2026 = document
      .getElementById("year-2026")!
      .querySelector("button")!;

    expect(header2027).toHaveAttribute("aria-expanded", "true");
    expect(header2026).toHaveAttribute("aria-expanded", "false");
  });

  it("scrolls the deep-linked year into view", () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;

    renderWithTheme(
      <ProjectionAccordion
        snapshots={snapshotsWithPayoff}
        accounts={[giroAccount, mortgageAccount]}
        initialYear={2027}
      />
    );

    expect(scrollIntoView).toHaveBeenCalled();
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

    fireEvent.click(
      screen.getByText("Oct").closest('[data-testid="month-row"]')!
    );

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

    fireEvent.click(
      screen.getByText("Nov").closest('[data-testid="month-row"]')!
    );
    expect(mockNavigate).toHaveBeenCalledWith("/months/2026-11");

    fireEvent.click(
      screen.getByText("Dec").closest('[data-testid="month-row"]')!
    );
    expect(mockNavigate).toHaveBeenCalledWith("/months/2026-12");
  });
});

// The same de-DE currency formatter the Money primitive uses, so value
// assertions compare against exactly what renders (U+00A0 included).
const eur = new Intl.NumberFormat("de-DE", {
  style: "currency",
  currency: "EUR",
});
const euro = (cents: number) => eur.format(cents / 100);
const hasText = (text: string) => (_: string, el: Element | null) =>
  el?.textContent === text && el.children.length === 0;

// Accounts in the user's sortOrder — deliberately not kind order: the
// Tagesgeld comes first, the Girokonto second, the Mortgage is never a column.
const reserveAccount: AccountWithBalance = {
  id: "t1",
  kind: "Tagesgeld",
  name: "Reserve",
  openingBalance: 0,
  openingDate: "2026-01-01",
  balance: 0,
  color: "#aa3366",
  showInTrajectory: false,
};

const columnAccounts: AccountWithBalance[] = [
  reserveAccount,
  giroAccount,
  mortgageAccount,
];

// One snapshot per month, 2026-10 through 2028-12. Girokonto and Tagesgeld
// carry month-distinct balances; the Restschuld steps from 500 000 to 200 000
// in November 2026 (a 300 000 Sondertilgung) and to zero in November 2027 —
// the Payoff Month.
function monthsFrom2026To2028(): string[] {
  const months: string[] = [];
  for (let y = 2026; y <= 2028; y++) {
    for (let m = y === 2026 ? 10 : 1; m <= 12; m++) {
      months.push(`${y}-${String(m).padStart(2, "0")}`);
    }
  }
  return months;
}

const columnSnapshots: MonthlySnapshot[] = monthsFrom2026To2028().map(
  (month, i) => {
    const g1 = 1000000 + i * 1111;
    const t1 = 2000000 + i * 2222;
    const m1 = month < "2026-11" ? 500000 : month < "2027-11" ? 200000 : 0;
    return {
      month,
      accounts: {
        g1: { projected: g1 },
        t1: { projected: t1 },
        m1: { projected: m1 },
      },
      netCashflow: 4321,
      totalLiquid: g1 + t1,
    };
  }
);

const snapshotFor = (month: string) =>
  columnSnapshots.find((s) => s.month === month)!;

const annualST: RecurringTransaction = {
  id: "rt-st",
  accountId: "t1",
  linkedAccountId: "m1",
  amount: 300000,
  description: "Sondertilgung",
  category: "Mortgage",
  frequency: "annual",
  dayOfMonth: 1,
  monthOfYear: 11,
};

const monthlyRepayment: RecurringTransaction = {
  id: "rt-rate",
  accountId: "g1",
  linkedAccountId: "m1",
  amount: 150000,
  description: "Mortgage rate",
  category: "Mortgage",
  frequency: "monthly",
  dayOfMonth: 1,
};

function columnsAccordion(
  initialYear: number,
  recurringTransactions: RecurringTransaction[]
) {
  return (
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <ProjectionAccordion
          snapshots={columnSnapshots}
          accounts={columnAccounts}
          recurringTransactions={recurringTransactions}
          initialYear={initialYear}
        />
      </MemoryRouter>
    </ThemeProvider>
  );
}

function renderColumns(
  initialYear: number,
  recurringTransactions: RecurringTransaction[] = []
) {
  const result = render(columnsAccordion(initialYear, recurringTransactions));
  return {
    ...result,
    rerenderWith: (next: RecurringTransaction[]) =>
      result.rerender(columnsAccordion(initialYear, next)),
  };
}

const stRowMonths = () =>
  Array.from(document.querySelectorAll('[data-st-month="true"]')).map(
    (row) => row.textContent ?? ""
  );

describe("ProjectionAccordion — Projection columns", () => {
  it('is titled "Projection"', () => {
    renderColumns(2026);

    expect(screen.getByText("Projection", { exact: true })).toBeInTheDocument();
    expect(screen.queryByText("Projection Accordion")).not.toBeInTheDocument();
  });

  it("heads one column per non-Mortgage account, in input order, each with its colour chip", () => {
    renderColumns(2026);

    const reserve = screen.getByText("Reserve");
    const main = screen.getByText("Main");
    expect(
      reserve.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(screen.queryByText("DSL Mortgage")).not.toBeInTheDocument();

    const chips = screen.getAllByTestId("chip");
    expect(chips.map((chip) => chip.getAttribute("data-color"))).toEqual([
      "#aa3366",
      chartColors.Girokonto,
    ]);
  });

  it("puts Period first, then the accounts, then Total Liquid and Restschuld", () => {
    renderColumns(2026);

    const order = [
      "Period",
      "Reserve",
      "Main",
      "Total Liquid",
      "Restschuld",
    ].map((label) => screen.getByText(label, { exact: true }));
    order.slice(1).forEach((el, i) => {
      expect(
        order[i].compareDocumentPosition(el) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
    });
  });

  it("has no Net Cashflow or Sondertilgung column", () => {
    renderColumns(2026, [annualST]);

    expect(screen.queryByText("Net Cashflow")).not.toBeInTheDocument();
    expect(screen.queryByText("Sondertilgung")).not.toBeInTheDocument();
  });

  it("shows each account's projected end-of-year balance in the year row", () => {
    renderColumns(2026);

    const dec2026 = snapshotFor("2026-12");
    const yearRow = screen.getByRole("button", { name: /2026/ });
    expect(
      within(yearRow).getByText(hasText(euro(dec2026.accounts.t1.projected)))
    ).toBeInTheDocument();
    expect(
      within(yearRow).getByText(hasText(euro(dec2026.accounts.g1.projected)))
    ).toBeInTheDocument();
  });

  it("shows each account's projected balance in an expanded month row", () => {
    renderColumns(2027);

    const mar2027 = snapshotFor("2027-03");
    const row = screen.getByText("Mar").closest('[data-testid="month-row"]')!;
    expect(
      within(row as HTMLElement).getByText(
        hasText(euro(mar2027.accounts.t1.projected))
      )
    ).toBeInTheDocument();
    expect(
      within(row as HTMLElement).getByText(
        hasText(euro(mar2027.accounts.g1.projected))
      )
    ).toBeInTheDocument();
  });
});

const openYear = (year: number) =>
  fireEvent.click(screen.getByRole("button", { name: new RegExp(`^${year}`) }));

describe("ProjectionAccordion — Sondertilgung months", () => {
  it("highlights annual-transfer months up to and including payoff, never after", () => {
    renderColumns(2026, [annualST]);

    // 2026: November, the first annual transfer.
    let highlighted = stRowMonths();
    expect(highlighted).toHaveLength(1);
    expect(highlighted[0]).toContain("Nov");

    // 2027: November again — the transfer that pays the mortgage off.
    openYear(2027);
    highlighted = stRowMonths();
    expect(highlighted).toHaveLength(1);
    expect(highlighted[0]).toContain("Nov");

    // 2028: the transfer still fires, but there is no Restschuld left.
    openYear(2028);
    expect(stRowMonths()).toHaveLength(0);
  });

  it("highlights nothing for a monthly-only repayment", () => {
    const { rerenderWith } = renderColumns(2026, [monthlyRepayment]);

    expect(stRowMonths()).toHaveLength(0);

    // Control: the same view does highlight once an annual transfer exists.
    rerenderWith([monthlyRepayment, annualST]);
    expect(stRowMonths()).toHaveLength(1);
  });

  it("no longer infers a Sondertilgung from a Restschuld step-down alone", () => {
    // The Restschuld steps down in November 2026, but with no annual transfer
    // feeding it that month is not an ST Month.
    const { rerenderWith } = renderColumns(2026, []);

    expect(stRowMonths()).toHaveLength(0);

    rerenderWith([annualST]);
    expect(stRowMonths()).toHaveLength(1);
  });

  it("does not print the Sondertilgung amount", () => {
    renderColumns(2026, [annualST]);

    expect(screen.queryAllByText(hasText(euro(-300000)))).toHaveLength(0);
    expect(screen.queryAllByText(hasText(euro(300000)))).toHaveLength(0);
  });
});
