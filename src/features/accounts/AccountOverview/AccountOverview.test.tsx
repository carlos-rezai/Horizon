// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, afterEach } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../tokens";
import AccountOverview from "./AccountOverview";
import { columnOf } from "../../../testing/columnOf/columnOf";

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
  anchorBalance: number;
  anchorDate: string;
  balance: number;
  sondertilgungAllowance?: number;
  icon?: string | null;
  color?: string | null;
}

const mockAccounts: AccountWithBalance[] = [
  {
    id: "1",
    kind: "Girokonto",
    name: "Main Checking",
    anchorBalance: 100000,
    anchorDate: "2026-01-01",
    balance: 150000,
  },
  {
    id: "2",
    kind: "Tagesgeld",
    name: "DKB Reserve",
    anchorBalance: 200000,
    anchorDate: "2026-01-01",
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

describe("AccountOverview — avatar rendering", () => {
  it("renders an Avatar for each account", () => {
    render(
      <ThemeProvider theme={theme}>
        <MemoryRouter>
          <AccountOverview accounts={mockAccounts} />
        </MemoryRouter>
      </ThemeProvider>
    );

    expect(screen.getAllByTestId("avatar")).toHaveLength(mockAccounts.length);
  });

  it("renders a kind-icon avatar even when icon and color are null", () => {
    const accounts: AccountWithBalance[] = [
      {
        id: "1",
        kind: "Girokonto",
        name: "Main Checking",
        anchorBalance: 100000,
        anchorDate: "2026-01-01",
        balance: 150000,
        icon: null,
        color: null,
      },
    ];

    const { container } = render(
      <ThemeProvider theme={theme}>
        <MemoryRouter>
          <AccountOverview accounts={accounts} />
        </MemoryRouter>
      </ThemeProvider>
    );

    expect(screen.getByTestId("avatar")).toBeInTheDocument();
    expect(container.querySelector("svg")).toBeInTheDocument();
  });
});

// Issue #274 — figures right-align through Money inside a DataRow column that
// the shared column definition marks end-aligned, in the Dashboard accounts list as in every list.
describe("AccountOverview — figures right-align (#274)", () => {
  it("right-aligns every money figure in its row", () => {
    render(
      <ThemeProvider theme={theme}>
        <MemoryRouter>
          <AccountOverview accounts={mockAccounts} />
        </MemoryRouter>
      </ThemeProvider>
    );

    const figures = screen.getAllByTestId("money");
    expect(figures.length).toBeGreaterThan(0);
    figures.forEach((figure) => expect(columnOf(figure)?.align).toBe("end"));
  });
});
