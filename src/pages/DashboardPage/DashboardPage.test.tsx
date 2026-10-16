// @vitest-environment jsdom
import {
  render,
  screen,
  cleanup,
  waitFor,
  fireEvent,
  within,
  act,
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
import CacheProvider from "../../components/CacheProvider/CacheProvider";
import type { AccountWithBalance } from "../../types/account";
import type { MonthlySnapshot } from "../../types/projection";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const accounts: AccountWithBalance[] = [
  {
    id: "acc-1",
    kind: "Girokonto",
    name: "Main Checking",
    anchorBalance: 100000,
    anchorDate: "2026-01-01",
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
      <CacheProvider>
        <SnackbarProvider>
          <MemoryRouter>
            <DashboardPage />
          </MemoryRouter>
        </SnackbarProvider>
      </CacheProvider>
    </ThemeProvider>
  );
}

function renderForCSS() {
  return render(
    <StyleSheetManager disableCSSOMInjection>
      <ThemeProvider theme={theme}>
        <CacheProvider>
          <SnackbarProvider>
            <MemoryRouter>
              <DashboardPage />
            </MemoryRouter>
          </SnackbarProvider>
        </CacheProvider>
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

// --- Progressive reveal ------------------------------------------------------
//
// Each Dashboard section owns its own loading, error and empty state. Proving
// that a fast section is not held back by a slow one needs the resources to be
// settled one at a time, so these tests replace the call-ordered mock above
// with a fetch that hands back a promise per resource and settles on demand.

type Resource =
  | "accounts"
  | "projection"
  | "history"
  | "imports"
  | "recurring"
  | "savingsGoal"
  | "other";

function resourceOf(url: string): Resource {
  if (url.includes("/projection/history")) return "history";
  if (url.includes("/projection")) return "projection";
  if (url.includes("/imports")) return "imports";
  if (url.includes("/recurring-transactions")) return "recurring";
  if (url.includes("/savings-goal")) return "savingsGoal";
  if (url.includes("/accounts")) return "accounts";
  return "other";
}

interface Settlement {
  value?: unknown;
  error?: Error;
}

function installDeferredFetch() {
  const pending = new Map<Resource, ((outcome: Settlement) => void)[]>();

  vi.spyOn(globalThis, "fetch").mockImplementation((input) => {
    const resource = resourceOf(String(input));
    return new Promise<Response>((resolve, reject) => {
      const queue = pending.get(resource) ?? [];
      queue.push(({ value, error }) => {
        if (error) reject(error);
        else resolve({ ok: true, json: async () => value } as Response);
      });
      pending.set(resource, queue);
    });
  });

  async function settle(resource: Resource, outcome: Settlement) {
    await act(async () => {
      const queue = pending.get(resource) ?? [];
      pending.set(resource, []);
      for (const settleOne of queue) settleOne(outcome);
      await new Promise((tick) => setTimeout(tick, 0));
    });
  }

  return {
    resolve: (resource: Resource, value: unknown) =>
      settle(resource, { value }),
    reject: (resource: Resource, error: Error) => settle(resource, { error }),
  };
}

const snapshots: MonthlySnapshot[] = [
  {
    month: "2026-01",
    accounts: { "acc-1": { projected: 150000 } },
    netCashflow: 50000,
    totalLiquid: 150000,
  },
  {
    month: "2026-12",
    accounts: { "acc-1": { projected: 200000 } },
    netCashflow: 50000,
    totalLiquid: 200000,
  },
  {
    month: "2027-12",
    accounts: { "acc-1": { projected: 260000 } },
    netCashflow: 60000,
    totalLiquid: 260000,
  },
];

const savingsGoalConfig = {
  mode: "manual",
  targetTotal: 0,
  targetDate: "2036-01",
  startedAt: "2026-01",
  manualMonthly: {},
};

/** The ordered section wrappers the Dashboard renders in every state.
 *  The trailing `$` keeps each section's own fade wrapper (`…-fade`, issue
 *  #205) out of the count — the layout being asserted is the sections'. */
function sectionOrder(): string[] {
  return screen
    .getAllByTestId(/^dashboard-section-[a-z]+$/)
    .map((el) => el.getAttribute("data-testid") ?? "");
}

describe("DashboardPage — progressive reveal", () => {
  let deferred: ReturnType<typeof installDeferredFetch>;

  beforeEach(() => {
    deferred = installDeferredFetch();
  });

  async function resolveEverything(accountList: AccountWithBalance[]) {
    await deferred.resolve("accounts", accountList);
    await deferred.resolve(
      "projection",
      accountList.length > 0 ? snapshots : []
    );
    await deferred.resolve("recurring", []);
    await deferred.resolve("history", []);
    await deferred.resolve("imports", []);
    await deferred.resolve("savingsGoal", savingsGoalConfig);
  }

  it("renders the page frame and every section skeleton before any data resolves", () => {
    renderPage();

    expect(screen.getByText("Dashboard")).toBeInTheDocument();
    expect(screen.getByTestId("kpi-strip-skeleton")).toBeInTheDocument();
    expect(
      screen.getByTestId("trajectory-horizon-skeleton")
    ).toBeInTheDocument();
    expect(screen.getByTestId("savings-streak-skeleton")).toBeInTheDocument();
    expect(screen.getByTestId("account-overview-skeleton")).toBeInTheDocument();
    expect(screen.getByTestId("plan-summary-skeleton")).toBeInTheDocument();

    // The all-or-nothing spinner gate is gone.
    expect(screen.queryByLabelText("Loading")).not.toBeInTheDocument();
  });

  it("reveals the accounts list as soon as accounts resolve, while the projection-backed sections stay skeletons", async () => {
    renderPage();

    await deferred.resolve("accounts", accounts);

    expect(screen.getByText("Main Checking")).toBeInTheDocument();
    expect(
      screen.queryByTestId("account-overview-skeleton")
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("kpi-strip-skeleton")).toBeInTheDocument();
    expect(
      screen.getByTestId("trajectory-horizon-skeleton")
    ).toBeInTheDocument();
    expect(screen.getByTestId("plan-summary-skeleton")).toBeInTheDocument();
  });

  it("reveals the plan summary as soon as the projection resolves, while the accounts list stays a skeleton", async () => {
    renderPage();

    await deferred.resolve("projection", snapshots);

    expect(screen.getAllByTestId("year-summary-row").length).toBeGreaterThan(0);
    expect(
      screen.queryByTestId("plan-summary-skeleton")
    ).not.toBeInTheDocument();
    expect(screen.getByTestId("account-overview-skeleton")).toBeInTheDocument();
  });

  it("swaps every section to its content once all data resolves", async () => {
    renderPage();

    await resolveEverything(accounts);

    const section = (name: string) =>
      within(screen.getByTestId(`dashboard-section-${name}`));

    expect(section("kpis").getByTestId("kpi-strip")).toBeInTheDocument();
    expect(
      section("trajectory").getByTestId("trajectory-horizon-chart")
    ).toBeInTheDocument();
    expect(section("accounts").getByText("Main Checking")).toBeInTheDocument();
    expect(
      section("plan").getAllByTestId("year-summary-row").length
    ).toBeGreaterThan(0);
    expect(screen.queryAllByTestId(/skeleton/)).toHaveLength(0);
  });

  it("keeps the section layout identical before and after the data lands", async () => {
    renderPage();

    const whileLoading = sectionOrder();
    expect(whileLoading).toHaveLength(5);

    await resolveEverything(accounts);

    expect(sectionOrder()).toEqual(whileLoading);
  });
});

describe("DashboardPage — per-section error states", () => {
  let deferred: ReturnType<typeof installDeferredFetch>;

  beforeEach(() => {
    deferred = installDeferredFetch();
  });

  it("errors only the sections backed by the failed resource", async () => {
    renderPage();

    await deferred.reject("accounts", new Error("Network error"));
    await deferred.resolve("projection", snapshots);

    for (const section of [
      "dashboard-section-accounts",
      "dashboard-section-kpis",
      "dashboard-section-trajectory",
    ]) {
      expect(
        within(screen.getByTestId(section)).getByText(/Network error/)
      ).toBeInTheDocument();
    }

    // The projection resolved, so the plan summary still renders its content.
    expect(
      within(screen.getByTestId("dashboard-section-plan")).getAllByTestId(
        "year-summary-row"
      ).length
    ).toBeGreaterThan(0);
  });

  it("replaces a failed section's skeleton, so error reads differently from loading", async () => {
    renderPage();

    await deferred.reject("accounts", new Error("Network error"));

    const accountsSection = screen.getByTestId("dashboard-section-accounts");
    expect(
      within(accountsSection).queryByTestId("account-overview-skeleton")
    ).not.toBeInTheDocument();
    expect(
      within(accountsSection).queryByText("No accounts yet.")
    ).not.toBeInTheDocument();
  });
});

describe("DashboardPage — empty states", () => {
  let deferred: ReturnType<typeof installDeferredFetch>;

  beforeEach(() => {
    deferred = installDeferredFetch();
  });

  it("shows the existing empty states rather than skeletons when every resource resolves empty", async () => {
    renderPage();

    await deferred.resolve("accounts", []);
    await deferred.resolve("projection", []);
    await deferred.resolve("recurring", []);
    await deferred.resolve("history", []);
    await deferred.resolve("imports", []);
    await deferred.resolve("savingsGoal", savingsGoalConfig);

    const section = (name: string) =>
      within(screen.getByTestId(`dashboard-section-${name}`));

    expect(
      section("accounts").getByText("No accounts yet.")
    ).toBeInTheDocument();
    expect(
      section("trajectory").getByTestId("trajectory-horizon-empty")
    ).toBeInTheDocument();
    expect(
      section("plan").getByText(
        "Add accounts on the dashboard to see your financial plan."
      )
    ).toBeInTheDocument();
    expect(screen.queryAllByTestId(/skeleton/)).toHaveLength(0);
  });
});

// Live-Use Repair #2 (issue #226): a fresh install reaches a working mortgage
// from the Dashboard itself, and the new mortgage shows without a reload.
describe("DashboardPage — Mortgage Setup", () => {
  const mortgage: AccountWithBalance = {
    id: "m-new",
    kind: "Mortgage",
    name: "Haus",
    anchorBalance: 20000000,
    anchorDate: "2026-10-16",
    balance: 20000000,
    originalPrincipal: 40000000,
    startDate: "2020-06-01",
    termYears: 25,
  };

  let serverAccounts: AccountWithBalance[];

  beforeEach(() => {
    serverAccounts = [...accounts];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      if (method === "POST" && url.endsWith("/mortgages")) {
        serverAccounts = [...serverAccounts, mortgage];
        return {
          ok: true,
          status: 201,
          json: async () => mortgage,
        } as Response;
      }
      if (method === "GET" && url.endsWith("/accounts")) {
        const snapshot = serverAccounts;
        return { ok: true, json: async () => snapshot } as Response;
      }
      return { ok: true, json: async () => [] } as Response;
    });
  });

  it("shows the new mortgage in the countdown after a successful save, without a reload", async () => {
    renderPage();

    fireEvent.click(
      await screen.findByRole("button", { name: "Set up mortgage" })
    );
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(/^name$/i), {
      target: { value: "Haus" },
    });
    fireEvent.change(within(dialog).getByLabelText(/restschuld today/i), {
      target: { value: "200000" },
    });
    fireEvent.change(within(dialog).getByLabelText(/original principal/i), {
      target: { value: "400000" },
    });
    fireEvent.change(within(dialog).getByLabelText(/^start date$/i), {
      target: { value: "01.06.2020" },
    });
    fireEvent.change(within(dialog).getByLabelText(/term/i), {
      target: { value: "25" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /save/i }));

    expect(await screen.findByText("remaining Restschuld")).toBeInTheDocument();
    expect(screen.queryByText("No mortgage yet")).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});

// Live-Use Repair #2 (issue #227): a setup that includes the repayment ends
// with a working payoff date on the Dashboard, without a reload.
describe("DashboardPage — Mortgage Setup with a repayment", () => {
  const mortgage: AccountWithBalance = {
    id: "m-new",
    kind: "Mortgage",
    name: "Haus",
    anchorBalance: 20000000,
    anchorDate: "2026-10-16",
    balance: 20000000,
    originalPrincipal: 40000000,
    startDate: "2020-06-01",
    termYears: 25,
  };

  const transfers = [
    {
      id: "r-1",
      accountId: "acc-1",
      linkedAccountId: "m-new",
      amount: 150000,
      description: "Mortgage repayment",
      category: "Transfer",
      frequency: "monthly",
      dayOfMonth: 1,
    },
  ];

  const paidOff: MonthlySnapshot[] = [
    {
      month: "2037-03",
      accounts: {
        "acc-1": { projected: 100000 },
        "m-new": { projected: 0 },
      },
      netCashflow: 0,
      totalLiquid: 100000,
    },
  ];

  let saved: boolean;

  beforeEach(() => {
    saved = false;
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
      const url = String(input);
      const method = init?.method ?? "GET";
      if (method === "POST" && url.endsWith("/mortgages")) {
        saved = true;
        return {
          ok: true,
          status: 201,
          json: async () => mortgage,
        } as Response;
      }
      if (method === "GET" && url.endsWith("/accounts")) {
        const snapshot = saved ? [...accounts, mortgage] : accounts;
        return { ok: true, json: async () => snapshot } as Response;
      }
      if (method === "GET" && url.endsWith("/recurring-transactions")) {
        const snapshot = saved ? transfers : [];
        return { ok: true, json: async () => snapshot } as Response;
      }
      if (method === "GET" && url.includes("/projection?")) {
        const snapshot = saved ? paidOff : [];
        return { ok: true, json: async () => snapshot } as Response;
      }
      return { ok: true, json: async () => [] } as Response;
    });
  });

  it("shows the payoff date in the countdown after saving a setup that includes the repayment", async () => {
    renderPage();

    fireEvent.click(
      await screen.findByRole("button", { name: "Set up mortgage" })
    );
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(/^name$/i), {
      target: { value: "Haus" },
    });
    fireEvent.change(within(dialog).getByLabelText(/restschuld today/i), {
      target: { value: "200000" },
    });
    fireEvent.change(within(dialog).getByLabelText(/original principal/i), {
      target: { value: "400000" },
    });
    fireEvent.change(within(dialog).getByLabelText(/^start date$/i), {
      target: { value: "01.06.2020" },
    });
    fireEvent.change(within(dialog).getByLabelText(/term/i), {
      target: { value: "25" },
    });
    fireEvent.change(within(dialog).getByLabelText(/paid from/i), {
      target: { value: "acc-1" },
    });
    fireEvent.change(within(dialog).getByLabelText(/monthly rate/i), {
      target: { value: "1500" },
    });
    fireEvent.click(within(dialog).getByRole("button", { name: /save/i }));

    // The Trajectory Horizon's payoff marker also reads "Mar 2037" and the KPI
    // strip also has a "To Payoff" tile; the countdown's are the ones outside.
    const trajectory = screen.getByTestId("dashboard-section-trajectory");
    const kpis = screen.getByTestId("dashboard-section-kpis");
    const outside = (el: HTMLElement) =>
      !trajectory.contains(el) && !kpis.contains(el);
    expect((await screen.findAllByText(/Mar 2037/)).some(outside)).toBe(true);
    expect(screen.getAllByText("To Payoff").some(outside)).toBe(true);
    expect(screen.queryByText(/No repayment set up/)).not.toBeInTheDocument();
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
