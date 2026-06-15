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
import { theme } from "../../../tokens";
import type { AccountWithBalance } from "../../../types/account";
import type { Transaction } from "../../../types/transaction";
import SpendingList from "./SpendingList";

const accounts: AccountWithBalance[] = [
  {
    id: "main",
    kind: "Girokonto",
    name: "Main",
    openingBalance: 0,
    openingDate: "2026-01-01",
    balance: 0,
    color: "#7FA7D9",
  },
  {
    id: "visa",
    kind: "CreditCard",
    name: "Visa",
    openingBalance: 0,
    openingDate: "2026-01-01",
    balance: 0,
    color: "#C9897F",
  },
];

function tx(overrides: Partial<Transaction>): Transaction {
  return {
    id: Math.random().toString(36).slice(2),
    accountId: "main",
    date: "2026-06-09",
    amount: -3420,
    description: "Fressnapf — cat food",
    category: "Cat",
    ...overrides,
  };
}

const transactions: Transaction[] = [
  tx({
    id: "t1",
    accountId: "main",
    date: "2026-06-09",
    description: "Cat food",
    category: "Cat",
  }),
  tx({
    id: "t2",
    accountId: "visa",
    date: "2026-06-07",
    description: "Zalando",
    category: "Shopping",
    amount: -11930,
  }),
  tx({
    id: "t3",
    accountId: "main",
    date: "2026-06-02",
    description: "REWE",
    category: "Groceries",
    amount: -8742,
  }),
];

function renderList(
  props: Partial<React.ComponentProps<typeof SpendingList>> = {}
) {
  return render(
    <ThemeProvider theme={theme}>
      <SpendingList
        accounts={accounts}
        transactions={transactions}
        monthLabel="June"
        onAddExpense={props.onAddExpense ?? vi.fn()}
        onEditTransaction={props.onEditTransaction ?? vi.fn()}
      />
    </ThemeProvider>
  );
}

afterEach(cleanup);

describe("SpendingList", () => {
  it("titles the section with the month label", () => {
    renderList();
    expect(screen.getByText("Spending in June")).toBeInTheDocument();
  });

  it("renders an All accounts tab counting every transaction", () => {
    renderList();
    const allTab = screen.getByRole("tab", { name: /All accounts/i });
    expect(within(allTab).getByText("3")).toBeInTheDocument();
  });

  it("renders one tab per account with its own count", () => {
    renderList();
    expect(
      within(screen.getByRole("tab", { name: /Main/ })).getByText("2")
    ).toBeInTheDocument();
    expect(
      within(screen.getByRole("tab", { name: /Visa/ })).getByText("1")
    ).toBeInTheDocument();
  });

  it("shows all transactions on the All accounts tab", () => {
    renderList();
    expect(screen.getByText("Cat food")).toBeInTheDocument();
    expect(screen.getByText("Zalando")).toBeInTheDocument();
    expect(screen.getByText("REWE")).toBeInTheDocument();
  });

  it("filters to the selected account when its tab is clicked", () => {
    renderList();
    fireEvent.click(screen.getByRole("tab", { name: /Visa/ }));
    expect(screen.getByText("Zalando")).toBeInTheDocument();
    expect(screen.queryByText("Cat food")).not.toBeInTheDocument();
  });

  it("renders the category badge for each row", () => {
    renderList();
    expect(screen.getByText("Shopping")).toBeInTheDocument();
    expect(screen.getByText("Groceries")).toBeInTheDocument();
  });

  it("renders the day-of-month for each row", () => {
    renderList();
    // 2026-06-09 → day 9, parsed from the ISO string (no timezone shift)
    expect(screen.getByText("9")).toBeInTheDocument();
  });

  it("calls onEditTransaction with the clicked transaction", () => {
    const onEditTransaction = vi.fn();
    renderList({ onEditTransaction });
    fireEvent.click(screen.getByText("Cat food"));
    expect(onEditTransaction).toHaveBeenCalledWith(
      expect.objectContaining({ id: "t1" })
    );
  });

  it("calls onAddExpense with the active account when Add expense is clicked", () => {
    const onAddExpense = vi.fn();
    renderList({ onAddExpense });
    fireEvent.click(screen.getByRole("button", { name: /add expense/i }));
    // Default tab is All accounts → first account
    expect(onAddExpense).toHaveBeenCalledWith("main");
  });

  it("passes the selected account to onAddExpense after a tab switch", () => {
    const onAddExpense = vi.fn();
    renderList({ onAddExpense });
    fireEvent.click(screen.getByRole("tab", { name: /Visa/ }));
    fireEvent.click(screen.getByRole("button", { name: /add expense/i }));
    expect(onAddExpense).toHaveBeenCalledWith("visa");
  });

  it("shows an empty state when there is no spending", () => {
    render(
      <ThemeProvider theme={theme}>
        <SpendingList
          accounts={accounts}
          transactions={[]}
          monthLabel="June"
          onAddExpense={vi.fn()}
          onEditTransaction={vi.fn()}
        />
      </ThemeProvider>
    );
    expect(screen.getByText(/no variable spending/i)).toBeInTheDocument();
  });
});
