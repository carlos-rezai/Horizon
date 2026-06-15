// @vitest-environment jsdom
import {
  render,
  screen,
  cleanup,
  waitFor,
  fireEvent,
} from "@testing-library/react";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { ThemeProvider, StyleSheetManager } from "styled-components";
import { theme } from "../../tokens";
import AccountDetailPage from "./AccountDetailPage";
import type { AccountWithBalance } from "../../types/account";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function renderPage() {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={["/accounts/acc-1"]}>
        <Routes>
          <Route path="/accounts/:id" element={<AccountDetailPage />} />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  );
}

function renderForCSS() {
  return render(
    <StyleSheetManager disableCSSOMInjection>
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={["/accounts/acc-1"]}>
          <Routes>
            <Route path="/accounts/:id" element={<AccountDetailPage />} />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </StyleSheetManager>
  );
}

function getInjectedCSS(): string {
  return Array.from(document.querySelectorAll("style"))
    .map((el) => el.textContent ?? "")
    .join("\n");
}

const accounts: AccountWithBalance[] = [
  {
    id: "acc-1",
    kind: "Girokonto",
    name: "Main Checking",
    openingBalance: 100000,
    openingDate: "2026-01-01",
    balance: 150000,
  },
  {
    id: "acc-2",
    kind: "Tagesgeld",
    name: "DKB Reserve",
    openingBalance: 200000,
    openingDate: "2026-01-01",
    balance: 220000,
  },
];

function mockAllSuccess() {
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
}

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

  it("shows the Add recurring button in the recurring transactions section", async () => {
    renderPage();

    expect(
      await screen.findByRole("button", { name: /add recurring/i })
    ).toBeInTheDocument();
  });
});

describe("AccountDetailPage — card surfaces", () => {
  beforeEach(mockAllSuccess);

  it("renders at least 2 card surfaces — header and recurring transactions", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByTestId("card").length).toBeGreaterThanOrEqual(2);
    });
  });
});

describe("AccountDetailPage — back navigation", () => {
  beforeEach(mockAllSuccess);

  it("renders an inline back navigation link in the page header", async () => {
    renderPage();
    expect(
      await screen.findByRole("link", { name: /back/i })
    ).toBeInTheDocument();
  });
});

describe("AccountDetailPage — transaction entry removed", () => {
  beforeEach(mockAllSuccess);

  it("does not render Add transaction or Add transfer buttons", async () => {
    renderPage();
    await screen.findByRole("button", { name: /add recurring/i });
    expect(
      screen.queryByRole("button", { name: /add transaction/i })
    ).toBeNull();
    expect(screen.queryByRole("button", { name: /add transfer/i })).toBeNull();
  });
});

describe("AccountDetailPage — account edit modal", () => {
  beforeEach(mockAllSuccess);

  it("clicking the pencil edit button opens AccountCreateModal pre-populated with the account name", async () => {
    renderPage();
    const pencil = await screen.findByRole("button", { name: "Edit account" });
    fireEvent.click(pencil);
    expect(
      await screen.findByRole("heading", { name: /edit account/i })
    ).toBeInTheDocument();
    expect(screen.getByDisplayValue("Main Checking")).toBeInTheDocument();
  });
});

describe("AccountDetailPage — error states", () => {
  it("shows error-colored text when accounts loading fails", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new Error("Failed to load"))
      .mockResolvedValue({
        ok: true,
        json: async () => [],
      } as Response);
    renderForCSS();
    await waitFor(() => {
      expect(getInjectedCSS()).toContain(theme.colors.error);
    });
  });
});
