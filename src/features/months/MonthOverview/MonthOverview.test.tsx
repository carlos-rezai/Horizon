// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { ThemeProvider } from "styled-components";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { theme } from "../../../tokens";
import type { AccountWithBalance } from "../../../types/account";
import type { MonthlySnapshot } from "../../../types/projection";

const mockNavigate = vi.fn();
vi.mock("react-router-dom", async (importOriginal) => {
  const actual = await importOriginal<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mockNavigate };
});

import MonthOverview from "./MonthOverview";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const mockAccounts: AccountWithBalance[] = [
  {
    id: "g1",
    kind: "Girokonto",
    name: "Main Checking",
    openingBalance: 100000,
    openingDate: "2026-01-01",
    balance: 150000,
  },
  {
    id: "t1",
    kind: "Tagesgeld",
    name: "DKB Reserve",
    openingBalance: 200000,
    openingDate: "2026-01-01",
    balance: 220000,
  },
];

const mockSnapshots: MonthlySnapshot[] = [
  {
    month: "2026-05",
    accounts: {
      g1: { projected: 145000 },
      t1: { projected: 215000, actual: 218000 },
    },
    netCashflow: 0,
    totalLiquid: 363000,
  },
  {
    month: "2026-06",
    accounts: {
      g1: { projected: 148000 },
      t1: { projected: 221000 },
    },
    netCashflow: 0,
    totalLiquid: 369000,
  },
];

function renderMonthOverview(
  month = "2026-05",
  accounts: AccountWithBalance[] = mockAccounts,
  snapshots: MonthlySnapshot[] = []
) {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[`/months/${month}`]}>
        <Routes>
          <Route
            path="/months/:month"
            element={
              <MonthOverview accounts={accounts} snapshots={snapshots} />
            }
          />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  );
}

describe("MonthOverview — rendering", () => {
  it("renders without crashing for a given month param", () => {
    expect(() => renderMonthOverview("2026-05")).not.toThrow();
  });
});

describe("MonthOverview — account tabs", () => {
  it("renders one tab per account", () => {
    renderMonthOverview();

    expect(
      screen.getByRole("tab", { name: "Main Checking" })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("tab", { name: "DKB Reserve" })
    ).toBeInTheDocument();
  });

  it("first account tab is selected by default", () => {
    renderMonthOverview();

    const firstTab = screen.getByRole("tab", { name: "Main Checking" });
    expect(firstTab).toHaveAttribute("aria-selected", "true");
  });

  it("clicking a tab makes it the active tab", () => {
    renderMonthOverview();

    fireEvent.click(screen.getByRole("tab", { name: "DKB Reserve" }));

    expect(screen.getByRole("tab", { name: "DKB Reserve" })).toHaveAttribute(
      "aria-selected",
      "true"
    );
    expect(screen.getByRole("tab", { name: "Main Checking" })).toHaveAttribute(
      "aria-selected",
      "false"
    );
  });
});

describe("MonthOverview — back navigation", () => {
  it("clicking the back button calls navigate(-1)", () => {
    renderMonthOverview();

    fireEvent.click(screen.getByRole("button", { name: /back/i }));

    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });
});

describe("MonthOverview — balance summary bar", () => {
  it("renders the projected balance for each account for the selected month", () => {
    renderMonthOverview("2026-05", mockAccounts, mockSnapshots);

    // g1 projected: 145000 cents = 1,450.00 €
    expect(screen.getByText(/1[.,]450/)).toBeInTheDocument();
  });

  it("shows actual balance instead of projected when actual data is present", () => {
    renderMonthOverview("2026-05", mockAccounts, mockSnapshots);

    // t1 actual: 218000 cents = 2,180.00 € (not projected 215000 = 2,150)
    expect(screen.getByText(/2[.,]180/)).toBeInTheDocument();
    expect(screen.queryByText(/2[.,]150/)).not.toBeInTheDocument();
  });

  it("shows the correct snapshot values when the month param changes", () => {
    renderMonthOverview("2026-06", mockAccounts, mockSnapshots);

    // g1 projected for 2026-06: 148000 cents = 1,480.00 €
    expect(screen.getByText(/1[.,]480/)).toBeInTheDocument();
  });
});
