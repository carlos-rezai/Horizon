// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { ThemeProvider, StyleSheetManager } from "styled-components";
import { MemoryRouter } from "react-router-dom";
import { theme } from "../../../tokens";
import RecurringTransactionList from "./RecurringTransactionList";
import type { RecurringTransaction } from "../../../types/recurring";
import type { AccountWithBalance } from "../../../types/account";

function getInjectedCSS(): string {
  return Array.from(document.querySelectorAll("style"))
    .map((el) => el.textContent ?? "")
    .join("\n");
}

function getCSSForElement(el: HTMLElement): string {
  const classes = Array.from(el.classList);
  const allCSS = getInjectedCSS();
  return classes
    .flatMap((cls) => {
      const regex = new RegExp(`\\.${cls}\\b[^{]*\\{[^}]*\\}`, "g");
      return allCSS.match(regex) ?? [];
    })
    .join("\n");
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const rt: RecurringTransaction = {
  id: "rt-1",
  accountId: "acc-1",
  amount: -120000,
  description: "Rent",
  category: "Housing",
  frequency: "monthly",
  dayOfMonth: 5,
};

const linkedRt: RecurringTransaction = {
  id: "rt-3",
  accountId: "acc-1",
  amount: -50000,
  description: "Savings deposit",
  category: "Transfer",
  frequency: "monthly",
  dayOfMonth: 25,
  linkedAccountId: "acc-2",
};

const positiveRt: RecurringTransaction = {
  id: "rt-pos",
  accountId: "acc-1",
  amount: 323643,
  description: "Salary",
  category: "Income",
  frequency: "monthly",
  dayOfMonth: 1,
};

const mockAccounts: AccountWithBalance[] = [
  {
    id: "acc-2",
    kind: "Tagesgeld",
    name: "Savings",
    anchorBalance: 0,
    anchorDate: "2026-01-01",
    balance: 0,
  },
];

const renderRtList = (
  recurringTransactions: RecurringTransaction[],
  overrides: Partial<{
    accountId: string;
    accounts: AccountWithBalance[];
    onRowClick: (rt: RecurringTransaction) => void;
  }> = {}
) => {
  const props = {
    recurringTransactions,
    accountId: "acc-1",
    onRowClick: vi.fn(),
    ...overrides,
  };
  render(
    <MemoryRouter>
      <ThemeProvider theme={theme}>
        <RecurringTransactionList {...props} />
      </ThemeProvider>
    </MemoryRouter>
  );
  return props;
};

describe("RecurringTransactionList — row content", () => {
  it("renders description, frequency, and day of month for each entry", () => {
    renderRtList([rt]);

    expect(screen.getByText("Rent")).toBeInTheDocument();
    expect(screen.getByText(/monthly/i)).toBeInTheDocument();
    expect(screen.getByText(/5/)).toBeInTheDocument();
  });

  it("renders the amount in euros", () => {
    renderRtList([rt]);

    // -120000 cents = -1200.00 euros
    expect(screen.getByText(/-1[.,]200/)).toBeInTheDocument();
  });

  it("does not render a checkbox column", () => {
    renderRtList([rt]);

    expect(screen.queryByRole("checkbox")).toBeNull();
  });
});

describe("RecurringTransactionList — interactions", () => {
  it("calls onRowClick with the recurring transaction when the row is clicked", () => {
    const onRowClick = vi.fn();
    renderRtList([rt], { onRowClick });

    fireEvent.click(screen.getByText("Rent"));

    expect(onRowClick).toHaveBeenCalledWith(rt);
  });
});

describe("RecurringTransactionList — column headers", () => {
  it("renders column headers: Name, Amount, Day, Frequency", () => {
    renderRtList([rt]);

    expect(screen.getByText("Name")).toBeInTheDocument();
    expect(screen.getByText("Amount")).toBeInTheDocument();
    expect(screen.getByText("Day")).toBeInTheDocument();
    expect(screen.getByText("Frequency")).toBeInTheDocument();
  });

  it("does not render a separate 'To account' column header", () => {
    renderRtList([rt]);

    expect(screen.queryByText("To account")).toBeNull();
  });
});

describe("RecurringTransactionList — linked account indicator", () => {
  it("shows the destination account name as a sub-line for a linked transfer", () => {
    renderRtList([linkedRt], { accounts: mockAccounts });

    expect(screen.getByText("Savings")).toBeInTheDocument();
  });

  it("renders a colour dot beside the linked account name", () => {
    renderRtList([linkedRt], { accounts: mockAccounts });

    expect(screen.getByTestId("chip")).toBeInTheDocument();
  });

  it("shows no linked indicator for a non-linked row", () => {
    renderRtList([rt]);

    expect(screen.queryByTestId("chip")).toBeNull();
  });
});

describe("RecurringTransactionList — ordinal day", () => {
  it("renders dayOfMonth as an ordinal (5 → '5th')", () => {
    renderRtList([rt]);

    expect(screen.getByText("5th")).toBeInTheDocument();
  });

  it("renders ordinals for edge cases (1st, 2nd, 22nd)", () => {
    const fixtures: RecurringTransaction[] = [
      { ...rt, id: "rt-a", dayOfMonth: 1, description: "First" },
      { ...rt, id: "rt-b", dayOfMonth: 2, description: "Second" },
      { ...rt, id: "rt-c", dayOfMonth: 22, description: "TwentySecond" },
    ];
    renderRtList(fixtures);

    expect(screen.getByText("1st")).toBeInTheDocument();
    expect(screen.getByText("2nd")).toBeInTheDocument();
    expect(screen.getByText("22nd")).toBeInTheDocument();
  });
});

describe("RecurringTransactionList — empty state", () => {
  it("renders an empty state message when the list is empty", () => {
    renderRtList([]);

    expect(screen.getByText(/no recurring transactions/i)).toBeInTheDocument();
  });
});

describe("RecurringTransactionList — amount coloring", () => {
  function renderForCSS(
    recurringTransactions: RecurringTransaction[],
    accountId = "acc-1",
    accounts: AccountWithBalance[] = []
  ) {
    render(
      <MemoryRouter>
        <StyleSheetManager disableCSSOMInjection>
          <ThemeProvider theme={theme}>
            <RecurringTransactionList
              recurringTransactions={recurringTransactions}
              accountId={accountId}
              accounts={accounts}
              onRowClick={vi.fn()}
            />
          </ThemeProvider>
        </StyleSheetManager>
      </MemoryRouter>
    );
  }

  it("positive amount renders with secondary color", () => {
    renderForCSS([positiveRt]);

    const amountEl = screen.getByText(/3[.,]236/);
    expect(getCSSForElement(amountEl)).toContain(theme.colors.secondary);
  });

  it("negative amount renders with error color", () => {
    renderForCSS([rt]);

    const amountEl = screen.getByText(/-1[.,]200/);
    expect(getCSSForElement(amountEl)).toContain(theme.colors.error);
  });

  it("a transfer renders as a red −amount on its source account", () => {
    renderForCSS([transfer], "acc-1", transferAccounts);

    const amountEl = screen.getByText(/-500[.,]00/);
    expect(getCSSForElement(amountEl)).toContain(theme.colors.error);
  });

  it("a Mirrored Transfer Row renders as a green +amount from its source", () => {
    renderForCSS([transfer], "acc-2", transferAccounts);

    const amountEl = screen.getByText(/\+500[.,]00/);
    expect(getCSSForElement(amountEl)).toContain(theme.colors.secondary);
    expect(screen.getByTestId("data-row")).toHaveTextContent(/from\s*Postbank/);
  });
});

const transfer: RecurringTransaction = {
  id: "rt-transfer",
  accountId: "acc-1",
  amount: 50000,
  description: "Savings deposit",
  category: "Transfer",
  frequency: "monthly",
  dayOfMonth: 25,
  linkedAccountId: "acc-2",
};

const transferAccounts: AccountWithBalance[] = [
  {
    id: "acc-1",
    kind: "Girokonto",
    name: "Postbank",
    anchorBalance: 0,
    anchorDate: "2026-01-01",
    balance: 0,
  },
  {
    id: "acc-2",
    kind: "Tagesgeld",
    name: "Savings",
    anchorBalance: 0,
    anchorDate: "2026-01-01",
    balance: 0,
  },
];

describe("RecurringTransactionList — recurring transfer on its source account", () => {
  it("shows −amount with the destination account and opens the edit modal", () => {
    const onRowClick = vi.fn();
    renderRtList([transfer], {
      accountId: "acc-1",
      accounts: transferAccounts,
      onRowClick,
    });

    expect(screen.getByText(/-500[.,]00/)).toBeInTheDocument();
    expect(screen.getByText("Savings")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();

    fireEvent.click(screen.getByText("Savings deposit"));
    expect(onRowClick).toHaveBeenCalledWith(transfer);
  });
});

describe("RecurringTransactionList — Mirrored Transfer Row on the destination account", () => {
  it("shows +amount and 'from <source>'", () => {
    renderRtList([transfer], {
      accountId: "acc-2",
      accounts: transferAccounts,
    });

    expect(screen.getByText(/\+500[.,]00/)).toBeInTheDocument();
    expect(screen.getByTestId("data-row")).toHaveTextContent(/from\s*Postbank/);
  });

  it("is a link to the source account page", () => {
    renderRtList([transfer], {
      accountId: "acc-2",
      accounts: transferAccounts,
    });

    const link = screen.getByRole("link");
    expect(link).toHaveAttribute("href", "/accounts/acc-1");
    expect(link).toHaveTextContent("Savings deposit");
  });

  it("never opens the edit modal", () => {
    const onRowClick = vi.fn();
    renderRtList([transfer], {
      accountId: "acc-2",
      accounts: transferAccounts,
      onRowClick,
    });

    fireEvent.click(screen.getByText("Savings deposit"));
    expect(onRowClick).not.toHaveBeenCalled();
  });
});
