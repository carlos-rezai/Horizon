// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach } from "vitest";

afterEach(() => {
  cleanup();
});
import AccountOverview from "./AccountOverview";

type AccountKind =
  | "Girokonto"
  | "Tagesgeld"
  | "Mortgage"
  | "CreditCard"
  | "Investment";
interface AccountWithBalance {
  _id: string;
  kind: AccountKind;
  name: string;
  openingBalance: number;
  openingDate: string;
  balance: number;
  sondertilgungAllowance?: number;
}

const mockAccounts: AccountWithBalance[] = [
  {
    _id: "1",
    kind: "Girokonto",
    name: "Main Checking",
    openingBalance: 100000,
    openingDate: "2026-01-01",
    balance: 150000,
  },
  {
    _id: "2",
    kind: "Tagesgeld",
    name: "DKB Reserve",
    openingBalance: 200000,
    openingDate: "2026-01-01",
    balance: 220000,
  },
];

describe("AccountOverview", () => {
  it("renders each account name and AccountKind", () => {
    render(<AccountOverview accounts={mockAccounts} />);

    expect(screen.getByText("Main Checking")).toBeInTheDocument();
    expect(screen.getByText("Girokonto")).toBeInTheDocument();
    expect(screen.getByText("DKB Reserve")).toBeInTheDocument();
    expect(screen.getByText("Tagesgeld")).toBeInTheDocument();
  });

  it("renders the current balance for each account", () => {
    render(<AccountOverview accounts={mockAccounts} />);

    // 150000 cents — rendered in some formatted form containing 1,500 or 1.500
    expect(screen.getByText(/1[.,]500/)).toBeInTheDocument();
    // 220000 cents — rendered in some formatted form containing 2,200 or 2.200
    expect(screen.getByText(/2[.,]200/)).toBeInTheDocument();
  });

  it("shows an empty state when no accounts exist", () => {
    render(<AccountOverview accounts={[]} />);

    expect(screen.getByText(/no accounts/i)).toBeInTheDocument();
  });
});
