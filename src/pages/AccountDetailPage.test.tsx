// @vitest-environment jsdom
import { render, screen, cleanup } from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../tokens";
import AccountDetailPage from "./AccountDetailPage";
import type { AccountWithBalance } from "../types/account";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const accounts: AccountWithBalance[] = [
  {
    _id: "acc-1",
    kind: "Girokonto",
    name: "Main Checking",
    openingBalance: 100000,
    openingDate: "2026-01-01",
    balance: 150000,
  },
  {
    _id: "acc-2",
    kind: "Tagesgeld",
    name: "DKB Reserve",
    openingBalance: 200000,
    openingDate: "2026-01-01",
    balance: 220000,
  },
];

const renderPage = () =>
  render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={["/accounts/acc-1"]}>
        <Routes>
          <Route path="/accounts/:id" element={<AccountDetailPage />} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  );

describe("AccountDetailPage — transfer button", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => accounts,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      } as Response)
      .mockResolvedValue({
        ok: true,
        json: async () => [],
      } as Response);
  });

  it("shows both Add transaction and Add transfer buttons in the transactions section", async () => {
    renderPage();

    expect(
      await screen.findByRole("button", { name: /add transaction/i })
    ).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: /add transfer/i })
    ).toBeInTheDocument();
  });
});

describe("AccountDetailPage — recurring transactions button", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => accounts,
      } as Response)
      .mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      } as Response)
      .mockResolvedValue({
        ok: true,
        json: async () => [],
      } as Response);
  });

  it("shows the Add recurring transaction button in the recurring transactions section", async () => {
    renderPage();

    expect(
      await screen.findByRole("button", { name: /add recurring transaction/i })
    ).toBeInTheDocument();
  });
});
