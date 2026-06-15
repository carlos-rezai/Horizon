// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../tokens";
import type { AccountWithBalance } from "../../../types/account";
import AccountHero from "./AccountHero";

function acc(overrides: Partial<AccountWithBalance>): AccountWithBalance {
  return {
    id: "a1",
    kind: "Tagesgeld",
    name: "Tagesgeld",
    openingBalance: 1274000,
    openingDate: "2025-01-01",
    balance: 1820000,
    color: "#74C29B",
    ...overrides,
  };
}

function renderHero(
  props: Partial<React.ComponentProps<typeof AccountHero>> = {}
) {
  const account = props.account ?? acc({});
  return render(
    <ThemeProvider theme={theme}>
      <AccountHero
        account={account}
        accounts={props.accounts ?? [account]}
        balanceSeries={props.balanceSeries ?? [1000, 1200, 1500, 1820]}
        hasTransactions={props.hasTransactions ?? false}
        onEdit={props.onEdit ?? vi.fn()}
        onDelete={props.onDelete ?? vi.fn()}
      />
    </ThemeProvider>
  );
}

afterEach(cleanup);

describe("AccountHero", () => {
  it("renders the account name", () => {
    renderHero();
    expect(
      screen.getByRole("heading", { name: "Tagesgeld" })
    ).toBeInTheDocument();
  });

  it("renders an avatar for the account", () => {
    renderHero();
    expect(screen.getByTestId("avatar")).toBeInTheDocument();
  });

  it("renders the account kind as a badge", () => {
    renderHero();
    expect(screen.getByText("Tagesgeld", { selector: "span" })).toBeTruthy();
  });

  it("renders the derived per-kind subtitle", () => {
    renderHero();
    expect(screen.getByText("Savings account")).toBeInTheDocument();
  });

  it("renders a status dot in the account colour", () => {
    renderHero();
    const chips = screen.getAllByTestId("chip");
    expect(chips.some((c) => c.getAttribute("data-color") === "#74C29B")).toBe(
      true
    );
  });

  it("labels the balance 'Current Balance' for a liquid account", () => {
    renderHero();
    expect(screen.getByText(/current balance/i)).toBeInTheDocument();
  });

  it("labels the balance 'Restschuld' for a Mortgage", () => {
    renderHero({
      account: acc({ kind: "Mortgage", name: "Home Loan", balance: 9000000 }),
    });
    expect(screen.getByText("Restschuld")).toBeInTheDocument();
  });

  it("renders the formatted current balance", () => {
    renderHero();
    // 1820000 cents → 18.200,00 €
    expect(screen.getByText(/18[.,]200/)).toBeInTheDocument();
  });

  it("renders a sparkline when the series has at least two points", () => {
    renderHero({ balanceSeries: [1000, 1200] });
    expect(screen.getByTestId("sparkline")).toBeInTheDocument();
  });

  it("renders no sparkline for a series shorter than two points", () => {
    renderHero({ balanceSeries: [1000] });
    expect(screen.queryByTestId("sparkline")).not.toBeInTheDocument();
  });

  it("invokes onEdit when Edit is clicked", () => {
    const onEdit = vi.fn();
    renderHero({ onEdit });
    fireEvent.click(screen.getByRole("button", { name: /edit/i }));
    expect(onEdit).toHaveBeenCalled();
  });

  it("invokes onDelete after confirming a delete", () => {
    const onDelete = vi.fn();
    renderHero({ onDelete });
    fireEvent.click(screen.getByRole("button", { name: /^delete/i }));
    fireEvent.click(screen.getByRole("button", { name: /confirm/i }));
    expect(onDelete).toHaveBeenCalled();
  });

  it("disables Delete when the account has transactions", () => {
    renderHero({ hasTransactions: true });
    expect(screen.getByRole("button", { name: /^delete/i })).toBeDisabled();
  });
});
