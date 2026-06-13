// @vitest-environment jsdom
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { MemoryRouter, Routes, Route } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { theme } from "../../tokens";
import AppLayout from "./AppLayout";

function renderAtRoute(path: string) {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={[path]}>
        <Routes>
          <Route
            path="/"
            element={
              <AppLayout>
                <p>Dashboard content</p>
              </AppLayout>
            }
          />
          <Route
            path="/plan"
            element={
              <AppLayout>
                <p>Plan content</p>
              </AppLayout>
            }
          />
          <Route
            path="/months/:month"
            element={
              <AppLayout>
                <p>Month content</p>
              </AppLayout>
            }
          />
          <Route
            path="/import"
            element={
              <AppLayout>
                <p>Import content</p>
              </AppLayout>
            }
          />
          <Route
            path="/accounts/:id"
            element={
              <AppLayout>
                <p>Account content</p>
              </AppLayout>
            }
          />
          <Route
            path="/settings/storage"
            element={
              <AppLayout>
                <p>Settings content</p>
              </AppLayout>
            }
          />
        </Routes>
      </MemoryRouter>
    </ThemeProvider>
  );
}

// The Month nav points at the current calendar month. Compute it the same way
// here so the assertion stays correct across month boundaries.
function currentMonth(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

afterEach(() => {
  cleanup();
  // Guard against fake-timer leakage from a test that throws before its own
  // vi.useRealTimers() call (keeps later real-timer tests honest).
  vi.useRealTimers();
});

describe("AppLayout — branding", () => {
  it("renders the sun-arc brand mark as an accessible graphic", () => {
    renderAtRoute("/");
    expect(screen.getByRole("img", { name: /horizon/i })).toBeInTheDocument();
  });

  it("renders the HORIZON wordmark", () => {
    renderAtRoute("/");
    expect(screen.getByText("HORIZON")).toBeInTheDocument();
  });

  it("renders the brand mark on the account detail route", () => {
    renderAtRoute("/accounts/abc123");
    expect(screen.getByRole("img", { name: /horizon/i })).toBeInTheDocument();
  });
});

describe("AppLayout — back arrow", () => {
  it("does not render a back arrow on the dashboard route", () => {
    renderAtRoute("/");
    expect(
      screen.queryByRole("button", { name: /back/i })
    ).not.toBeInTheDocument();
  });

  it("does not render a back arrow on the account detail route", () => {
    renderAtRoute("/accounts/abc123");
    expect(
      screen.queryByRole("button", { name: /back/i })
    ).not.toBeInTheDocument();
  });
});

describe("AppLayout — content", () => {
  it("renders its children", () => {
    renderAtRoute("/");
    expect(screen.getByText("Dashboard content")).toBeInTheDocument();
  });
});

describe("AppLayout — nav set", () => {
  it("renders the five nav links in order: Dashboard, Outlook, Month, Import, Settings", () => {
    renderAtRoute("/");
    const names = screen
      .getAllByRole("link")
      .map((link) => link.textContent?.trim());
    expect(names).toEqual([
      "Dashboard",
      "Outlook",
      "Month",
      "Import",
      "Settings",
    ]);
  });

  it("Dashboard link targets /", () => {
    renderAtRoute("/");
    expect(screen.getByRole("link", { name: /dashboard/i })).toHaveAttribute(
      "href",
      "/"
    );
  });

  it("Outlook link targets /plan", () => {
    renderAtRoute("/");
    expect(screen.getByRole("link", { name: /outlook/i })).toHaveAttribute(
      "href",
      "/plan"
    );
  });

  it("Month link targets the current month", () => {
    renderAtRoute("/");
    expect(screen.getByRole("link", { name: /month/i })).toHaveAttribute(
      "href",
      `/months/${currentMonth()}`
    );
  });

  it("Import link targets /import", () => {
    renderAtRoute("/");
    expect(screen.getByRole("link", { name: /import/i })).toHaveAttribute(
      "href",
      "/import"
    );
  });

  it("Settings link targets /settings/storage", () => {
    renderAtRoute("/");
    expect(screen.getByRole("link", { name: /settings/i })).toHaveAttribute(
      "href",
      "/settings/storage"
    );
  });

  it("no longer renders a 'Financial Plan' nav label", () => {
    renderAtRoute("/");
    expect(
      screen.queryByRole("link", { name: /financial plan/i })
    ).not.toBeInTheDocument();
  });
});

describe("AppLayout — active nav state", () => {
  it("Dashboard is active at /", () => {
    renderAtRoute("/");
    expect(screen.getByRole("link", { name: /dashboard/i })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  it("Dashboard is not active at /plan", () => {
    renderAtRoute("/plan");
    expect(
      screen.getByRole("link", { name: /dashboard/i })
    ).not.toHaveAttribute("aria-current", "page");
  });

  it("Outlook is active at /plan", () => {
    renderAtRoute("/plan");
    expect(screen.getByRole("link", { name: /outlook/i })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  it("Month is active on any /months/:month route", () => {
    // Deliberately a month different from the link's current-month href, to
    // prove highlighting matches the route family, not an exact href.
    renderAtRoute("/months/2026-05");
    expect(screen.getByRole("link", { name: /month/i })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  it("Import is active at /import", () => {
    renderAtRoute("/import");
    expect(screen.getByRole("link", { name: /import/i })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  it("Settings is active at /settings/storage", () => {
    renderAtRoute("/settings/storage");
    expect(screen.getByRole("link", { name: /settings/i })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  it("Import is not active at /", () => {
    renderAtRoute("/");
    expect(screen.getByRole("link", { name: /import/i })).not.toHaveAttribute(
      "aria-current",
      "page"
    );
  });
});

describe("AppLayout — sidebar clock", () => {
  it("renders the Clock in the sidebar", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-15T15:30:00"));
    renderAtRoute("/");
    expect(screen.getByText("15:30")).toBeInTheDocument();
    vi.useRealTimers();
  });

  it("positions the Clock between the Import and Settings nav items", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-01-15T15:30:00"));
    renderAtRoute("/");
    const importLink = screen.getByRole("link", { name: /import/i });
    const clock = screen.getByText("15:30");
    const settingsLink = screen.getByRole("link", { name: /settings/i });
    // Import precedes Clock, Clock precedes Settings in document order.
    expect(
      importLink.compareDocumentPosition(clock) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      clock.compareDocumentPosition(settingsLink) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    vi.useRealTimers();
  });
});

describe("AppLayout — InsufficientFundsWarnings", () => {
  beforeEach(() => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => [
        {
          ccAccountId: "cc-1",
          fundingAccountId: "g-1",
          settlementAmount: 45000,
          settlementMonth: "2026-05",
          settlementDay: 17,
        },
      ],
    } as Response);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("renders an insufficient funds warning when the hook returns a non-empty array", async () => {
    renderAtRoute("/");
    await waitFor(() => {
      expect(screen.getByText(/insufficient funds/i)).toBeInTheDocument();
    });
  });
});
