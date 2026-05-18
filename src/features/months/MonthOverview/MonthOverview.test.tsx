// @vitest-environment jsdom
import { render, screen, cleanup, fireEvent } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { ThemeProvider } from "styled-components";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { theme } from "../../../tokens";
import type { AccountWithBalance } from "../../../types/account";

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

function renderMonthOverview(
  month = "2026-05",
  accounts: AccountWithBalance[] = mockAccounts
) {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[`/months/${month}`]}>
        <Routes>
          <Route
            path="/months/:month"
            element={<MonthOverview accounts={accounts} />}
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
});

describe("MonthOverview — back navigation", () => {
  it("clicking the back button calls navigate(-1)", () => {
    renderMonthOverview();

    fireEvent.click(screen.getByRole("button", { name: /back/i }));

    expect(mockNavigate).toHaveBeenCalledWith(-1);
  });
});
