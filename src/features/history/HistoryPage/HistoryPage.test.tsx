// @vitest-environment jsdom
import {
  render,
  screen,
  cleanup,
  waitFor,
  fireEvent,
} from "@testing-library/react";
import { describe, it, expect, afterEach, beforeEach, vi } from "vitest";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../tokens";
import HistoryPage from "./HistoryPage";
import CacheProvider from "../../../components/CacheProvider/CacheProvider";

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
    anchorBalance: 0,
    anchorDate: "2020-01-01",
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
      <CacheProvider>
        <MemoryRouter>
          <HistoryPage />
        </MemoryRouter>
      </CacheProvider>
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

  it("hides the History Trends card", async () => {
    renderPage();
    expect(await screen.findByText(/no history yet/i)).toBeInTheDocument();
    expect(screen.queryByTestId("history-trends")).not.toBeInTheDocument();
  });

  it("hints at importing a statement or adding the mortgage's origination", async () => {
    renderPage();
    expect(
      await screen.findByText(
        "Import a bank statement or add your mortgage's origination to see your history"
      )
    ).toBeInTheDocument();
  });
});

// History Span (issue #239): an account anchored months ago has a History even
// when nothing has been imported, and its year is listed in the archive.
describe("HistoryPage — history without imports", () => {
  beforeEach(() => mockFetch(POINTS, [], ACCOUNTS));

  it("renders the history chart, not the empty state", async () => {
    renderPage();
    expect(await screen.findByTestId("history-chart")).toBeInTheDocument();
    expect(screen.queryByText(/no history yet/i)).not.toBeInTheDocument();
  });

  it("lists the known year in the Year Archive with no statement badge", async () => {
    renderPage();
    expect(await screen.findByText("Year Archive")).toBeInTheDocument();
    expect(screen.getByText("2023")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /statement/i })).toBeNull();
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

// History Trends (Financial History, issue #243): the card sits between the
// chart and the Year Archive, and one set of 1Y / 3Y / All chips governs both.
describe("HistoryPage — History Trends", () => {
  // Fifteen months, 2023-01 through 2024-03; the first is the span's first
  // month and has no Monthly Savings.
  const LONG_POINTS = Array.from({ length: 15 }, (_, i) => {
    const year = 2023 + Math.floor(i / 12);
    const month = (i % 12) + 1;
    return {
      month: `${year}-${String(month).padStart(2, "0")}`,
      totalLiquid: 500000 + i * 1000,
      restschuld: 0,
      restschuldBridge: null,
      netCashflow: 1000,
      monthlySavings: i === 0 ? null : 1000,
      accounts: { "acc-1": 500000 + i * 1000 },
    };
  });

  beforeEach(() => mockFetch(LONG_POINTS, [], ACCOUNTS));

  it("renders the trends card between the chart and the Year Archive", async () => {
    renderPage();
    const trends = await screen.findByTestId("history-trends");
    const chart = screen.getByTestId("history-chart");
    const archive = screen.getByText("Year Archive");

    expect(
      chart.compareDocumentPosition(trends) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      trends.compareDocumentPosition(archive) & Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("one range chip change updates both the chart and the trends card", async () => {
    renderPage();
    const trends = await screen.findByTestId("history-trends");
    expect(screen.getByTestId("history-chart")).toHaveAttribute(
      "data-months",
      "15"
    );
    expect(trends).toHaveAttribute("data-months", "15");

    // One set of chips: a single 1 Year button on the page.
    const chips = screen.getAllByRole("button", { name: "1 Year" });
    expect(chips).toHaveLength(1);
    fireEvent.click(chips[0]);

    expect(screen.getByTestId("history-chart")).toHaveAttribute(
      "data-months",
      "12"
    );
    expect(screen.getByTestId("history-trends")).toHaveAttribute(
      "data-months",
      "12"
    );
  });
});
