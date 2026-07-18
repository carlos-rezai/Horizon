// @vitest-environment jsdom
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../tokens";
import HistoryPage from "./HistoryPage";

const POINTS = [
  {
    month: "2023-03",
    totalLiquid: 500000,
    restschuld: 20000000,
    netCashflow: 120000,
    accounts: { "acc-1": 500000 },
  },
  {
    month: "2023-04",
    totalLiquid: 520000,
    restschuld: 19900000,
    netCashflow: 20000,
    accounts: { "acc-1": 520000 },
  },
];

const IMPORTS = [{ id: "imp-1", startDate: "2023-03-15" }];

// The page composes `useAccounts` for the chart's per-account series, so the
// loaded-state fetch mock must stub `/accounts` with a representative account
// whose id matches the points' `accounts` keys.
const ACCOUNTS = [
  {
    id: "acc-1",
    kind: "Girokonto",
    name: "Main",
    openingBalance: 0,
    openingDate: "2020-01-01",
    balance: 520000,
    color: null,
    showInTrajectory: true,
  },
];

function mockFetch(points: unknown, imports: unknown, accounts: unknown = []) {
  vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
    const url = typeof input === "string" ? input : input.toString();
    if (url.includes("/projection/history")) {
      return { ok: true, json: async () => points } as Response;
    }
    if (url.includes("/imports")) {
      return { ok: true, json: async () => imports } as Response;
    }
    if (url.includes("/accounts")) {
      return { ok: true, json: async () => accounts } as Response;
    }
    return { ok: true, json: async () => [] } as Response;
  });
}

function renderPage() {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <HistoryPage />
      </MemoryRouter>
    </ThemeProvider>
  );
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("HistoryPage — header", () => {
  beforeEach(() => mockFetch([], []));

  it("renders a History heading", async () => {
    renderPage();
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /histor/i })
      ).toBeInTheDocument();
    });
  });
});

describe("HistoryPage — empty state", () => {
  beforeEach(() => mockFetch([], []));

  it("renders an empty state when there are no imports", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText(/no history yet/i)).toBeInTheDocument();
    });
  });

  it("the empty state CTA links to /import", async () => {
    renderPage();
    const cta = await screen.findByRole("link", { name: /import/i });
    expect(cta).toHaveAttribute("href", "/import");
  });
});

describe("HistoryPage — loaded state", () => {
  beforeEach(() => mockFetch(POINTS, IMPORTS, ACCOUNTS));

  it("does not render the empty state once history is reconstructed", async () => {
    renderPage();
    // Header renders in both states; wait for it before asserting absence.
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { name: /histor/i })
      ).toBeInTheDocument();
    });
    expect(screen.queryByText(/no history yet/i)).not.toBeInTheDocument();
  });

  it("renders the reconstructed history chart", async () => {
    renderPage();
    expect(await screen.findByTestId("history-chart")).toBeInTheDocument();
  });

  it("renders the Year Archive with a row for each imported year", async () => {
    renderPage();
    expect(await screen.findByText("Year Archive")).toBeInTheDocument();
    // IMPORTS carries a 2023 statement, so the archive lists that year.
    expect(screen.getByText("2023")).toBeInTheDocument();
  });
});

describe("HistoryPage — loading and error states", () => {
  it("shows a loading spinner while the fetches are still pending", () => {
    // A fetch that never settles keeps both hooks in their loading state.
    vi.spyOn(globalThis, "fetch").mockReturnValue(
      new Promise<Response>(() => {})
    );
    renderPage();
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("shows a distinct error state, not the empty state, when a fetch fails", async () => {
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = typeof input === "string" ? input : input.toString();
      if (url.includes("/projection/history")) {
        return { ok: false, json: async () => [] } as Response;
      }
      return { ok: true, json: async () => [] } as Response;
    });
    renderPage();
    expect(await screen.findByText(/couldn't load/i)).toBeInTheDocument();
    // The masquerade this closes: a failed fetch must not read as "no imports".
    expect(screen.queryByText(/no history yet/i)).not.toBeInTheDocument();
  });
});
