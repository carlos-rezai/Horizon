// @vitest-environment jsdom
import { render, screen, cleanup, within } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";
import { ThemeProvider } from "styled-components";
import { MemoryRouter } from "react-router-dom";
import { theme } from "../../../tokens";
import type { AccountWithBalance } from "../../../types/account";
import type {
  MonthCashFlowReport,
  RecurringFixedFlow,
} from "../../../types/monthCashFlow";
import type { MonthEndBalance } from "../monthEndBalance/monthEndBalance";
import MonthCashFlow from "./MonthCashFlow";

// Accounts in their sortOrder: every kind, the Mortgage included.
const accounts: AccountWithBalance[] = [
  {
    id: "main",
    kind: "Girokonto",
    name: "Main",
    anchorBalance: 0,
    anchorDate: "2026-01-01",
    balance: 0,
    color: "#7FA7D9",
  },
  {
    id: "savings",
    kind: "Tagesgeld",
    name: "Savings",
    anchorBalance: 0,
    anchorDate: "2026-01-01",
    balance: 0,
    color: "#8FBF8F",
  },
  {
    id: "mortgage",
    kind: "Mortgage",
    name: "Mortgage",
    anchorBalance: 0,
    anchorDate: "2026-01-01",
    balance: 0,
  },
  {
    id: "etf",
    kind: "Investment",
    name: "ETF",
    anchorBalance: 0,
    anchorDate: "2026-01-01",
    balance: 0,
  },
];

function flow(overrides: Partial<RecurringFixedFlow>): RecurringFixedFlow {
  return {
    kind: "recurring",
    recurringId: "rule",
    date: "2026-09-01",
    description: "Rule",
    amount: 0,
    inAnchor: false,
    ...overrides,
  };
}

const report: MonthCashFlowReport = {
  month: "2026-09",
  accounts: [
    {
      accountId: "main",
      flows: [
        flow({
          recurringId: "rate",
          date: "2026-09-01",
          description: "Darlehen",
          category: "Housing",
          amount: -100000,
          counterpartId: "mortgage",
          side: "source",
        }),
        flow({
          recurringId: "save",
          date: "2026-09-03",
          description: "Savings plan",
          category: "Transfer",
          amount: -20000,
          counterpartId: "savings",
          side: "source",
        }),
        flow({
          recurringId: "netflix",
          date: "2026-09-12",
          description: "Netflix",
          category: "Entertainment",
          amount: -1299,
        }),
        flow({
          recurringId: "salary",
          date: "2026-09-25",
          description: "Salary",
          category: "Income",
          amount: 300000,
        }),
      ],
    },
    {
      accountId: "savings",
      flows: [
        flow({
          recurringId: "save",
          date: "2026-09-03",
          description: "Savings plan",
          category: "Transfer",
          amount: 20000,
          counterpartId: "main",
          side: "destination",
        }),
      ],
    },
    {
      accountId: "mortgage",
      flows: [
        flow({
          recurringId: "rate",
          date: "2026-09-01",
          description: "Darlehen",
          category: "Housing",
          amount: 100000,
          counterpartId: "main",
          side: "destination",
        }),
      ],
    },
    { accountId: "etf", flows: [] },
  ],
};

/** Each group's Month-End Balance, keyed by account id. */
const balances: Record<string, MonthEndBalance> = {
  main: { basis: "projected", cents: 123456700 },
  savings: { basis: "actual", cents: 800000 },
  mortgage: { basis: "projected", cents: 21000000 },
  etf: { basis: "unknown", knownFrom: "2027-03" },
};

function renderCard(
  r: MonthCashFlowReport = report,
  b: Record<string, MonthEndBalance> = balances
) {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <MonthCashFlow
          accounts={accounts}
          report={r}
          monthLabel="September"
          balances={b}
        />
      </MemoryRouter>
    </ThemeProvider>
  );
}

function groups(): HTMLElement[] {
  return screen.getAllByTestId("fixed-flow-group");
}

/** A group, found by the account name in its heading. */
function groupFor(name: string): HTMLElement {
  const group = groups().find(
    (g) => within(g).getByRole("heading").textContent === name
  );
  if (!group) throw new Error(`no group headed ${name}`);
  return group;
}

function rowFor(group: HTMLElement, description: string): HTMLElement {
  const row = within(group)
    .getAllByTestId("fixed-flow-row")
    .find((r) => within(r).queryByText(description));
  if (!row) throw new Error(`no row ${description}`);
  return row;
}

afterEach(() => {
  cleanup();
});

describe("MonthCashFlow — card", () => {
  it("heads the card Fixed Flows, titled for the month", () => {
    renderCard();

    expect(screen.getByText("Fixed Flows")).toBeInTheDocument();
    expect(screen.getByText("Fixed in September")).toBeInTheDocument();
  });

  it("renders one group per account, every kind included, in the report's order", () => {
    renderCard();

    expect(
      groups().map((g) => within(g).getByRole("heading").textContent)
    ).toEqual(["Main", "Savings", "Mortgage", "ETF"]);
  });

  it("heads each group with the account's Chip and name", () => {
    renderCard();

    const header = within(groupFor("Main")).getByTestId(
      "fixed-flow-group-head"
    );
    expect(within(header).getByTestId("chip")).toBeInTheDocument();
    expect(within(header).getByText("Main")).toBeInTheDocument();
  });

  it("does not tab the accounts", () => {
    renderCard();

    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
  });
});

describe("MonthCashFlow — rows", () => {
  it("lists each account's flows in date order", () => {
    renderCard();

    const order = ["Darlehen", "Savings plan", "Netflix", "Salary"];
    const descriptions = within(groupFor("Main"))
      .getAllByTestId("fixed-flow-row")
      .map((r) => order.find((d) => within(r).queryByText(d)));
    expect(descriptions).toEqual(order);
  });

  it("shows each row's day block, description and category", () => {
    renderCard();

    const salary = rowFor(groupFor("Main"), "Salary");
    expect(within(salary).getByText("25")).toBeInTheDocument();
    expect(within(salary).getByText("Sep")).toBeInTheDocument();
    expect(within(salary).getByText("Income")).toBeInTheDocument();
  });

  it("signs an inflow green with a plus and an outflow red with a minus", () => {
    renderCard();

    const main = groupFor("Main");
    expect(
      within(rowFor(main, "Salary")).getByText(/^\+3\.000,00/)
    ).toBeInTheDocument();
    expect(
      within(rowFor(main, "Netflix")).getByText(/^-12,99/)
    ).toBeInTheDocument();
  });

  it("marks a transfer's source leg red with an arrow to its destination", () => {
    renderCard();

    const row = rowFor(groupFor("Main"), "Savings plan");
    expect(within(row).getByText(/^-200,00/)).toBeInTheDocument();
    const line = within(row).getByTestId("fixed-flow-counterpart");
    expect(line.textContent).toContain("→");
    expect(line.textContent).toContain("Savings");
    expect(line.textContent).not.toContain("from");
    expect(within(line).getByTestId("chip")).toBeInTheDocument();
  });

  it("marks a transfer's destination leg green with an arrow from its source", () => {
    renderCard();

    const row = rowFor(groupFor("Savings"), "Savings plan");
    expect(within(row).getByText(/^\+200,00/)).toBeInTheDocument();
    const line = within(row).getByTestId("fixed-flow-counterpart");
    expect(line.textContent).toContain("←");
    expect(line.textContent).toContain("from Main");
    expect(within(line).getByTestId("chip")).toBeInTheDocument();
  });

  it("shows a Repayment Transfer as a green inflow on the Mortgage", () => {
    renderCard();

    const row = rowFor(groupFor("Mortgage"), "Darlehen");
    expect(within(row).getByText(/^\+1\.000,00/)).toBeInTheDocument();
    expect(
      within(row).getByTestId("fixed-flow-counterpart").textContent
    ).toContain("from Main");
  });

  it("gives a plain leg no counterpart line", () => {
    renderCard();

    const row = rowFor(groupFor("Main"), "Salary");
    expect(
      within(row).queryByTestId("fixed-flow-counterpart")
    ).not.toBeInTheDocument();
  });

  it("links every recurring row to its source account page", () => {
    renderCard();

    const linkOf = (group: string, description: string) =>
      within(rowFor(groupFor(group), description)).getByRole("link");

    expect(linkOf("Main", "Salary")).toHaveAttribute("href", "/accounts/main");
    expect(linkOf("Main", "Savings plan")).toHaveAttribute(
      "href",
      "/accounts/main"
    );
    expect(linkOf("Savings", "Savings plan")).toHaveAttribute(
      "href",
      "/accounts/main"
    );
    expect(linkOf("Mortgage", "Darlehen")).toHaveAttribute(
      "href",
      "/accounts/main"
    );
  });

  it("offers no editing", () => {
    renderCard();

    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});

describe("MonthCashFlow — group footer and empty state", () => {
  it("closes a group with a Net fixed footer summing its rows", () => {
    renderCard();

    // -1,000.00 - 200.00 - 12.99 + 3,000.00 = +1,787.01
    const footer = within(groupFor("Main")).getByTestId("fixed-flow-net");
    expect(footer).toHaveTextContent("Net fixed");
    expect(within(footer).getByText(/^\+1\.787,01/)).toBeInTheDocument();
  });

  it("nets a single-row group to that row", () => {
    renderCard();

    const footer = within(groupFor("Savings")).getByTestId("fixed-flow-net");
    expect(within(footer).getByText(/^\+200,00/)).toBeInTheDocument();
  });

  it("reads 'No fixed flows this month.' for an account without flows", () => {
    renderCard();

    const etf = groupFor("ETF");
    expect(
      within(etf).getByText("No fixed flows this month.")
    ).toBeInTheDocument();
    expect(within(etf).queryAllByTestId("fixed-flow-row")).toHaveLength(0);
  });

  it("reads 'No fixed flows this month.' in every group of an empty report", () => {
    renderCard({
      month: "2026-11",
      accounts: accounts.map((a) => ({ accountId: a.id, flows: [] })),
    });

    expect(screen.getAllByText("No fixed flows this month.")).toHaveLength(4);
  });
});

// ─────────────────────────────────────────────────────────────
// Issue #250 — Month-End Balance in the group headers
// ─────────────────────────────────────────────────────────────

function headFor(name: string): HTMLElement {
  return within(groupFor(name)).getByTestId("fixed-flow-group-head");
}

describe("MonthCashFlow — Month-End Balance", () => {
  it("shows a projected Month-End Balance captioned Month-end · Projected", () => {
    renderCard();

    const head = within(headFor("Main"));
    expect(head.getByText("1.234.567,00 €")).toBeInTheDocument();
    expect(head.getByText("Month-end · Projected")).toBeInTheDocument();
  });

  it("shows an actual Month-End Balance captioned Month-end · Actual", () => {
    renderCard();

    const head = within(headFor("Savings"));
    expect(head.getByText("8.000,00 €")).toBeInTheDocument();
    expect(head.getByText("Month-end · Actual")).toBeInTheDocument();
  });

  it("shows a Mortgage's Month-End Balance too", () => {
    renderCard();

    expect(
      within(headFor("Mortgage")).getByText("210.000,00 €")
    ).toBeInTheDocument();
  });

  it("reads an Unknown balance as 'No data before {Mon YYYY}', never €0", () => {
    renderCard();

    const head = headFor("ETF");
    expect(
      within(head).getByText("No data before Mar 2027")
    ).toBeInTheDocument();
    expect(head).not.toHaveTextContent("0,00 €");
    expect(within(head).queryByTestId("money")).not.toBeInTheDocument();
    expect(head).not.toHaveTextContent("Month-end · ");
  });

  it("shows a real zero balance as €0, not as Unknown", () => {
    renderCard(report, { ...balances, etf: { basis: "actual", cents: 0 } });

    const head = within(headFor("ETF"));
    expect(head.getByText("0,00 €")).toBeInTheDocument();
    expect(head.getByText("Month-end · Actual")).toBeInTheDocument();
    expect(head.queryByText(/No data before/)).not.toBeInTheDocument();
  });

  it("keeps the Month-End Balance out of the Net fixed footer", () => {
    renderCard();

    const footer = within(groupFor("Main")).getByTestId("fixed-flow-net");
    expect(footer).not.toHaveTextContent("1.234.567,00");
  });
});

// ─────────────────────────────────────────────────────────────
// Issue #253 — honest around the anchor
// ─────────────────────────────────────────────────────────────

// September 2026: Main's anchor month (15 Sep), a month before Savings' anchor
// month (15 Oct), and Cash has no anchor at all.
const anchorAccounts: AccountWithBalance[] = [
  {
    id: "main",
    kind: "Girokonto",
    name: "Main",
    anchorBalance: 0,
    anchorDate: "2026-09-15",
    balance: 0,
  },
  {
    id: "savings",
    kind: "Tagesgeld",
    name: "Savings",
    anchorBalance: 0,
    anchorDate: "2026-10-15",
    balance: 0,
  },
  {
    id: "cash",
    kind: "Girokonto",
    name: "Cash",
    anchorBalance: 0,
    anchorDate: "",
    balance: 0,
  },
];

const anchorReport: MonthCashFlowReport = {
  month: "2026-09",
  accounts: [
    {
      accountId: "main",
      flows: [
        flow({
          recurringId: "rent",
          date: "2026-09-01",
          description: "Rent",
          category: "Housing",
          amount: -100000,
          inAnchor: true,
        }),
        flow({
          recurringId: "salary",
          date: "2026-09-25",
          description: "Salary",
          category: "Income",
          amount: 300000,
        }),
      ],
    },
    { accountId: "savings", flows: [] },
    {
      accountId: "cash",
      flows: [
        flow({
          recurringId: "cashfee",
          date: "2026-09-05",
          description: "Cash fee",
          amount: -500,
        }),
      ],
    },
  ],
};

const BEFORE_SAVINGS_ANCHOR =
  "Before 15 Oct 2026 this account's history comes from its statements";

function renderAnchorCard() {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <MonthCashFlow
          accounts={anchorAccounts}
          report={anchorReport}
          monthLabel="September"
          balances={{}}
        />
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe("MonthCashFlow — honest around the anchor", () => {
  it("mutes a gate-blocked leg as 'In balance anchor' and leaves it out of Net fixed", () => {
    renderAnchorCard();

    const main = groupFor("Main");
    expect(
      within(rowFor(main, "Rent")).getByText("In balance anchor")
    ).toBeInTheDocument();
    // Only the salary counts: +3,000.00, not +2,000.00.
    const footer = within(main).getByTestId("fixed-flow-net");
    expect(within(footer).getByText(/^\+3\.000,00/)).toBeInTheDocument();
  });

  it("renders a leg after the Anchor Date normally and counts it", () => {
    renderAnchorCard();

    const main = groupFor("Main");
    const salary = rowFor(main, "Salary");
    expect(
      within(salary).queryByText("In balance anchor")
    ).not.toBeInTheDocument();
    expect(within(salary).getByText(/^\+3\.000,00/)).toBeInTheDocument();
    expect(within(main).getAllByText("In balance anchor")).toHaveLength(1);
    expect(
      within(main).queryByText(/history comes from its statements/)
    ).not.toBeInTheDocument();
  });

  it("lists no rule rows before the anchor month and shows the before-anchor note", () => {
    renderAnchorCard();

    const savings = groupFor("Savings");
    expect(within(savings).queryAllByTestId("fixed-flow-row")).toHaveLength(0);
    expect(
      within(savings).getByText(BEFORE_SAVINGS_ANCHOR)
    ).toBeInTheDocument();
  });

  it("leaves an account without an anchor unaffected", () => {
    renderAnchorCard();

    const cash = groupFor("Cash");
    expect(rowFor(cash, "Cash fee")).toBeInTheDocument();
    expect(
      within(cash).queryByText("In balance anchor")
    ).not.toBeInTheDocument();
    expect(
      within(cash).queryByText(/history comes from its statements/)
    ).not.toBeInTheDocument();
    const footer = within(cash).getByTestId("fixed-flow-net");
    expect(within(footer).getByText(/^-5,00/)).toBeInTheDocument();
    expect(
      screen.getAllByText(/history comes from its statements/)
    ).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// CreditCard settlement rows
// ---------------------------------------------------------------------------

const settleAccounts: AccountWithBalance[] = [
  accounts[0],
  {
    id: "visa",
    kind: "CreditCard",
    name: "Visa",
    anchorBalance: 0,
    anchorDate: "2026-01-01",
    balance: 0,
    color: "#D98F7F",
  },
];

// Main pays Visa's August cycle on 15 September: €40.00 out of Main, €40.00
// into Visa. Main also takes its €3,000.00 salary.
const settleReport: MonthCashFlowReport = {
  month: "2026-09",
  accounts: [
    {
      accountId: "main",
      flows: [
        {
          kind: "settlement",
          date: "2026-09-15",
          description: "Auto-settlement",
          category: "Transfer",
          amount: -4000,
          counterpartId: "visa",
          side: "source",
          inAnchor: false,
        },
        flow({
          recurringId: "salary",
          date: "2026-09-25",
          description: "Salary",
          category: "Income",
          amount: 300000,
        }),
      ],
    },
    {
      accountId: "visa",
      flows: [
        {
          kind: "settlement",
          date: "2026-09-15",
          description: "Auto-settlement",
          category: "Transfer",
          amount: 4000,
          counterpartId: "main",
          side: "destination",
          inAnchor: false,
        },
      ],
    },
  ],
};

function renderSettleCard() {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <MonthCashFlow
          accounts={settleAccounts}
          report={settleReport}
          monthLabel="September"
          balances={{}}
        />
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe("MonthCashFlow — CreditCard settlement rows", () => {
  it("links a settlement row to the CreditCard on both accounts and counts it in Net fixed", () => {
    renderSettleCard();

    const mainRow = rowFor(groupFor("Main"), "Auto-settlement");
    const visaRow = rowFor(groupFor("Visa"), "Auto-settlement");
    expect(within(mainRow).getByRole("link")).toHaveAttribute(
      "href",
      "/accounts/visa"
    );
    expect(within(visaRow).getByRole("link")).toHaveAttribute(
      "href",
      "/accounts/visa"
    );

    // -40.00 + 3,000.00 = +2,960.00 on Main; +40.00 on Visa.
    const mainNet = within(groupFor("Main")).getByTestId("fixed-flow-net");
    expect(within(mainNet).getByText(/^\+2\.960,00/)).toBeInTheDocument();
    const visaNet = within(groupFor("Visa")).getByTestId("fixed-flow-net");
    expect(within(visaNet).getByText(/^\+40,00/)).toBeInTheDocument();
  });
});
