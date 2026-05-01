// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, afterEach } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../tokens";
import AccountOverview from "./AccountOverview";

afterEach(() => {
  cleanup();
});

type AccountKind =
  | "Girokonto"
  | "Tagesgeld"
  | "Mortgage"
  | "CreditCard"
  | "Investment";
interface AccountWithBalance {
  id: string;
  kind: AccountKind;
  name: string;
  openingBalance: number;
  openingDate: string;
  balance: number;
  sondertilgungAllowance?: number;
}

const mockAccounts: AccountWithBalance[] = [
  {
    id: "1",
    kind: "Girokonto",
    name: "Main Checking",
    openingBalance: 100000,
    openingDate: "2026-01-01",
    balance: 150000,
  },
  {
    id: "2",
    kind: "Tagesgeld",
    name: "DKB Reserve",
    openingBalance: 200000,
    openingDate: "2026-01-01",
    balance: 220000,
  },
];

describe("AccountOverview", () => {
  it("renders each account name and AccountKind", () => {
    render(
      <ThemeProvider theme={theme}>
        <MemoryRouter>
          <AccountOverview accounts={mockAccounts} />
        </MemoryRouter>
      </ThemeProvider>
    );

    expect(screen.getByText("Main Checking")).toBeInTheDocument();
    expect(screen.getByText("Girokonto")).toBeInTheDocument();
    expect(screen.getByText("DKB Reserve")).toBeInTheDocument();
    expect(screen.getByText("Tagesgeld")).toBeInTheDocument();
  });

  it("renders the current balance for each account", () => {
    render(
      <ThemeProvider theme={theme}>
        <MemoryRouter>
          <AccountOverview accounts={mockAccounts} />
        </MemoryRouter>
      </ThemeProvider>
    );

    // 150000 cents — rendered in some formatted form containing 1,500 or 1.500
    expect(screen.getByText(/1[.,]500/)).toBeInTheDocument();
    // 220000 cents — rendered in some formatted form containing 2,200 or 2.200
    expect(screen.getByText(/2[.,]200/)).toBeInTheDocument();
  });

  it("shows an empty state when no accounts exist", () => {
    render(
      <ThemeProvider theme={theme}>
        <MemoryRouter>
          <AccountOverview accounts={[]} />
        </MemoryRouter>
      </ThemeProvider>
    );

    expect(screen.getByText(/no accounts/i)).toBeInTheDocument();
  });

  it("renders each account as a link to its detail page", () => {
    render(
      <ThemeProvider theme={theme}>
        <MemoryRouter>
          <AccountOverview accounts={mockAccounts} />
        </MemoryRouter>
      </ThemeProvider>
    );

    const links = screen.getAllByRole("link");
    const hrefs = links.map((l) => l.getAttribute("href"));

    expect(hrefs).toContain("/accounts/1");
    expect(hrefs).toContain("/accounts/2");
  });
});
