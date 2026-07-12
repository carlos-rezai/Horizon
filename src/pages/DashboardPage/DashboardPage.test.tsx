// @vitest-environment jsdom
import {
  render,
  screen,
  cleanup,
  waitFor,
  fireEvent,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";

const { mockNavigate } = vi.hoisted(() => ({ mockNavigate: vi.fn() }));
vi.mock("react-router-dom", async (importActual) => {
  const actual = await importActual<typeof import("react-router-dom")>();
  return { ...actual, useNavigate: () => mockNavigate };
});
import { ThemeProvider, StyleSheetManager } from "styled-components";
import { theme } from "../../tokens";
import DashboardPage from "./DashboardPage";
import SnackbarProvider from "../../components/SnackbarProvider/SnackbarProvider";
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
      <SnackbarProvider>
        <MemoryRouter>
          <DashboardPage />
        </MemoryRouter>
      </SnackbarProvider>
    </ThemeProvider>
  );
}

function renderForCSS() {
  return render(
    <StyleSheetManager disableCSSOMInjection>
      <ThemeProvider theme={theme}>
        <SnackbarProvider>
          <MemoryRouter>
            <DashboardPage />
          </MemoryRouter>
        </SnackbarProvider>
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

  it("renders at least 1 card surface — PlanSummary", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByTestId("card").length).toBeGreaterThanOrEqual(1);
    });
  });
});

describe("DashboardPage — composition", () => {
  beforeEach(mockAllSuccess);

  it("composes the KPI strip", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId("kpi-strip")).toBeInTheDocument();
    });
  });

  it("composes the Trajectory Horizon", async () => {
    renderPage();
    await waitFor(() => {
      expect(
        screen.getByTestId("trajectory-horizon-chart")
      ).toBeInTheDocument();
    });
  });

  it("composes the Plan Summary", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Plan Summary")).toBeInTheDocument();
    });
  });
});

describe("DashboardPage — history navigation", () => {
  beforeEach(() => {
    mockNavigate.mockClear();
    mockAllSuccess();
  });

  it("navigates to /history when the Trajectory Horizon View history link is clicked", async () => {
    renderPage();
    await waitFor(() => {
      expect(
        screen.getByTestId("trajectory-horizon-chart")
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: /view history/i }));

    expect(mockNavigate).toHaveBeenCalledWith("/history");
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
