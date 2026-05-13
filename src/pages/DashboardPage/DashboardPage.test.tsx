// @vitest-environment jsdom
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { ThemeProvider, StyleSheetManager } from "styled-components";
import { theme } from "../../tokens";
import DashboardPage from "./DashboardPage";
import type { AccountWithBalance } from "../../types/account";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const accounts: AccountWithBalance[] = [
  {
    id: "acc-1",
    kind: "Girokonto",
    name: "Main Checking",
    openingBalance: 100000,
    openingDate: "2026-01-01",
    balance: 150000,
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

function renderPage() {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <DashboardPage />
      </MemoryRouter>
    </ThemeProvider>
  );
}

function renderForCSS() {
  return render(
    <StyleSheetManager disableCSSOMInjection>
      <ThemeProvider theme={theme}>
        <MemoryRouter>
          <DashboardPage />
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

describe("DashboardPage — card surfaces", () => {
  beforeEach(mockAllSuccess);

  it("renders at least 2 card surfaces — TrajectoryHorizon and PlanSummary", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByTestId("card").length).toBeGreaterThanOrEqual(2);
    });
  });
});

describe("DashboardPage — error states", () => {
  it("shows error-colored text when the accounts fetch fails", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockRejectedValueOnce(new Error("Network error"))
      .mockResolvedValue({
        ok: true,
        json: async () => [],
      } as Response);
    renderForCSS();
    await waitFor(() => {
      expect(getInjectedCSS()).toContain(theme.colors.error);
    });
  });

  it("shows error-colored text when the projection fetch fails", async () => {
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce({
        ok: true,
        json: async () => accounts,
      } as Response)
      .mockRejectedValueOnce(new Error("Projection error"))
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
