// @vitest-environment jsdom
import {
  render,
  screen,
  cleanup,
  waitFor,
  within,
  act,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { ThemeProvider, StyleSheetManager } from "styled-components";
import { theme } from "../../tokens";
import PlanPage from "./PlanPage";
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
      <CacheProvider>
        <SnackbarProvider>
          <MemoryRouter initialEntries={["/plan"]}>
            <PlanPage />
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
            <MemoryRouter initialEntries={["/plan"]}>
              <PlanPage />
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

describe("PlanPage — card surfaces", () => {
  beforeEach(mockAllSuccess);

  it("renders the Outlook header and the accordion card surface", async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByText("Financial Plan")).toBeInTheDocument();
      expect(screen.getAllByTestId("card").length).toBeGreaterThanOrEqual(1);
    });
  });
});

// --- Progressive reveal ------------------------------------------------------
//
// The Plan page used to hide behind one all-or-nothing spinner. Proving that
// the frame is up from the first frame — and that each section owns its own
// loading, error and empty state — needs the resources settled on demand, so
// these tests replace the call-ordered mock above with a fetch that hands back
// a promise per resource.

type Resource = "accounts" | "projection" | "other";

function resourceOf(url: string): Resource {
  if (url.includes("/projection")) return "projection";
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
];

/** The ordered section wrappers the Plan page renders in every state.
 *  The trailing `$` keeps each section's own fade wrapper (`…-fade`, issue
 *  #205) out of the count — the layout being asserted is the sections'. */
function sectionOrder(): string[] {
  return screen
    .getAllByTestId(/^plan-section-[a-z]+$/)
    .map((el) => el.getAttribute("data-testid") ?? "");
}

describe("PlanPage — progressive reveal", () => {
  let deferred: ReturnType<typeof installDeferredFetch>;

  beforeEach(() => {
    deferred = installDeferredFetch();
  });

  it("renders the page frame and every section skeleton before any data resolves", () => {
    renderPage();

    expect(screen.getByText("Financial Plan")).toBeInTheDocument();
    expect(screen.getByTestId("outlook-summary-skeleton")).toBeInTheDocument();
    expect(
      screen.getByTestId("projection-accordion-skeleton")
    ).toBeInTheDocument();

    // The all-or-nothing spinner gate is gone.
    expect(screen.queryByLabelText("Loading")).not.toBeInTheDocument();
  });

  it("builds both section skeletons from the shared Skeleton primitive", () => {
    renderPage();

    for (const section of [
      "outlook-summary-skeleton",
      "projection-accordion-skeleton",
    ]) {
      expect(
        within(screen.getByTestId(section)).getAllByTestId("skeleton").length
      ).toBeGreaterThan(0);
    }
  });

  it("swaps every section to its content once all data resolves", async () => {
    renderPage();

    await deferred.resolve("accounts", accounts);
    await deferred.resolve("projection", snapshots);

    const section = (name: string) =>
      within(screen.getByTestId(`plan-section-${name}`));

    expect(
      section("outlook").getByTestId("outlook-summary")
    ).toBeInTheDocument();
    expect(
      section("accordion").getByText("Projection Accordion")
    ).toBeInTheDocument();
    expect(screen.queryAllByTestId(/skeleton/)).toHaveLength(0);
  });

  it("keeps the section layout identical before and after the data lands", async () => {
    renderPage();

    const whileLoading = sectionOrder();
    expect(whileLoading).toHaveLength(2);

    await deferred.resolve("accounts", accounts);
    await deferred.resolve("projection", snapshots);

    expect(sectionOrder()).toEqual(whileLoading);
  });
});

describe("PlanPage — per-section error states", () => {
  let deferred: ReturnType<typeof installDeferredFetch>;

  beforeEach(() => {
    deferred = installDeferredFetch();
  });

  it("keeps the page frame when a resource fails, erroring only its sections", async () => {
    renderPage();

    await deferred.reject("projection", new Error("Projection error"));
    await deferred.resolve("accounts", accounts);

    expect(screen.getByText("Financial Plan")).toBeInTheDocument();
    for (const section of ["plan-section-outlook", "plan-section-accordion"]) {
      expect(
        within(screen.getByTestId(section)).getByText(/Projection error/)
      ).toBeInTheDocument();
    }
  });

  it("replaces a failed section's skeleton, so error reads differently from loading", async () => {
    renderPage();

    await deferred.reject("accounts", new Error("Network error"));

    const outlook = screen.getByTestId("plan-section-outlook");
    expect(within(outlook).getByText(/Network error/)).toBeInTheDocument();
    expect(
      within(outlook).queryByTestId("outlook-summary-skeleton")
    ).not.toBeInTheDocument();
    expect(screen.queryAllByTestId(/skeleton/)).toHaveLength(0);
  });
});

describe("PlanPage — empty states", () => {
  let deferred: ReturnType<typeof installDeferredFetch>;

  beforeEach(() => {
    deferred = installDeferredFetch();
  });

  it("shows the accordion's existing empty state rather than a skeleton when there is no data", async () => {
    renderPage();

    await deferred.resolve("accounts", []);
    await deferred.resolve("projection", []);

    expect(
      within(screen.getByTestId("plan-section-accordion")).getByText(
        "Add accounts on the dashboard to see your financial plan."
      )
    ).toBeInTheDocument();
    expect(screen.queryAllByTestId(/skeleton/)).toHaveLength(0);
  });
});

describe("PlanPage — error states", () => {
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
