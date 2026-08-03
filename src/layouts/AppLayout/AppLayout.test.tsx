// @vitest-environment jsdom
import {
  render,
  screen,
  cleanup,
  waitFor,
  act,
  fireEvent,
} from "@testing-library/react";
import { describe, it, expect, afterEach, vi, beforeEach } from "vitest";
import { MemoryRouter, Routes, Route, useLocation } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { theme } from "../../tokens";
import { MANUAL_TRANSITION_MS } from "../../features/manual/useManualDrawer";
import AppLayout from "./AppLayout";

// Lets the manual tests prove the drawer is an overlay and not a navigation.
function LocationProbe() {
  const { pathname } = useLocation();
  return <span data-testid="pathname">{pathname}</span>;
}

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
                <LocationProbe />
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
            path="/history"
            element={
              <AppLayout>
                <p>History content</p>
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
  it("renders the six nav links in order: Dashboard, Outlook, Month, History, Import, Settings", () => {
    renderAtRoute("/");
    const names = screen
      .getAllByRole("link")
      .map((link) => link.textContent?.trim());
    expect(names).toEqual([
      "Dashboard",
      "Outlook",
      "Month",
      "History",
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

  it("History link targets /history", () => {
    renderAtRoute("/");
    expect(screen.getByRole("link", { name: /history/i })).toHaveAttribute(
      "href",
      "/history"
    );
  });

  it("History link sits between Month and Import", () => {
    renderAtRoute("/");
    const monthLink = screen.getByRole("link", { name: /month/i });
    const historyLink = screen.getByRole("link", { name: /history/i });
    const importLink = screen.getByRole("link", { name: /import/i });
    expect(
      monthLink.compareDocumentPosition(historyLink) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      historyLink.compareDocumentPosition(importLink) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
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

  it("History is active at /history", () => {
    renderAtRoute("/history");
    expect(screen.getByRole("link", { name: /history/i })).toHaveAttribute(
      "aria-current",
      "page"
    );
  });

  it("History is not active at /import", () => {
    renderAtRoute("/import");
    expect(screen.getByRole("link", { name: /history/i })).not.toHaveAttribute(
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

describe("AppLayout — Help & manual trigger", () => {
  it("renders a Help & manual trigger in the sidebar", () => {
    renderAtRoute("/");
    expect(
      screen.getByRole("button", { name: /help & manual/i })
    ).toBeInTheDocument();
  });

  it("is a button, not a navigation link — it opens an overlay rather than going somewhere", () => {
    renderAtRoute("/");
    expect(
      screen.queryByRole("link", { name: /help & manual/i })
    ).not.toBeInTheDocument();
  });

  it("sits below the nav, beneath Settings", () => {
    renderAtRoute("/");
    const settingsLink = screen.getByRole("link", { name: /settings/i });
    const trigger = screen.getByRole("button", { name: /help & manual/i });
    expect(
      settingsLink.compareDocumentPosition(trigger) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("is separated from the nav by a full-width divider", () => {
    renderAtRoute("/");
    const settingsLink = screen.getByRole("link", { name: /settings/i });
    const divider = screen.getByTestId("sidebar-divider");
    const trigger = screen.getByRole("button", { name: /help & manual/i });
    expect(
      settingsLink.compareDocumentPosition(divider) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
    expect(
      divider.compareDocumentPosition(trigger) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy();
  });

  it("does not reuse the nav link's styling — two interaction models, two visual weights", () => {
    renderAtRoute("/");
    const navClasses = new Set(
      screen.getByRole("link", { name: /settings/i }).classList
    );
    const triggerClasses = Array.from(
      screen.getByRole("button", { name: /help & manual/i }).classList
    );
    expect(triggerClasses.some((cls) => navClasses.has(cls))).toBe(false);
  });

  it("never takes an active/current treatment, on any route", () => {
    renderAtRoute("/settings/storage");
    expect(
      screen.getByRole("button", { name: /help & manual/i })
    ).not.toHaveAttribute("aria-current");
  });
});

describe("AppLayout — manual drawer", () => {
  it("is closed on launch — nothing opens it automatically", () => {
    renderAtRoute("/");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("opens from the Help & manual trigger", () => {
    renderAtRoute("/");
    fireEvent.click(screen.getByRole("button", { name: /help & manual/i }));
    expect(
      screen.getByRole("dialog", { name: /user manual/i })
    ).toBeInTheDocument();
  });

  it("leaves the screen behind mounted and the route unchanged", () => {
    renderAtRoute("/");
    fireEvent.click(screen.getByRole("button", { name: /help & manual/i }));

    expect(screen.getByText("Dashboard content")).toBeInTheDocument();
    expect(screen.getByTestId("pathname").textContent).toBe("/");
  });

  it("closes on ESC", () => {
    vi.useFakeTimers();
    renderAtRoute("/");
    fireEvent.click(screen.getByRole("button", { name: /help & manual/i }));

    fireEvent.keyDown(document, { key: "Escape" });
    act(() => {
      vi.advanceTimersByTime(MANUAL_TRANSITION_MS);
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it("closes from the header close button", () => {
    vi.useFakeTimers();
    renderAtRoute("/");
    fireEvent.click(screen.getByRole("button", { name: /help & manual/i }));

    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    act(() => {
      vi.advanceTimersByTime(MANUAL_TRANSITION_MS);
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it("closes from a backdrop click", () => {
    vi.useFakeTimers();
    renderAtRoute("/");
    fireEvent.click(screen.getByRole("button", { name: /help & manual/i }));

    fireEvent.click(screen.getByTestId("manual-backdrop"));
    act(() => {
      vi.advanceTimersByTime(MANUAL_TRANSITION_MS);
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    vi.useRealTimers();
  });

  it("reopens on a fresh drawer, so a reader who scrolled and closed starts at the top again", () => {
    vi.useFakeTimers();
    renderAtRoute("/");
    const trigger = screen.getByRole("button", { name: /help & manual/i });

    fireEvent.click(trigger);
    const firstPane = screen.getByTestId("manual-pane");
    firstPane.scrollTop = 240;

    fireEvent.click(screen.getByTestId("manual-backdrop"));
    act(() => {
      vi.advanceTimersByTime(MANUAL_TRANSITION_MS);
    });
    fireEvent.click(trigger);

    // The drawer left the tree on close, so there is no scroll position left
    // to restore — the reopened pane is a different element at the top.
    const secondPane = screen.getByTestId("manual-pane");
    expect(secondPane).not.toBe(firstPane);
    expect(secondPane.scrollTop).toBe(0);
    vi.useRealTimers();
  });
});

describe("AppLayout — manual drawer from the Electron Help menu", () => {
  // Captures the callback AppLayout registers for `menu:open-manual`, so a test
  // can drive the message the native Help menu item sends.
  let openManualCb: (() => void) | undefined;

  function installHorizon(): void {
    openManualCb = undefined;
    window.horizon = {
      apiBaseUrl: "",
      platform: "win32",
      electronVersion: "0.0.0",
      updates: {
        onUpdateDownloaded: () => () => {},
        onUpdateAvailable: () => () => {},
        onManualResult: () => () => {},
        quitAndInstall: vi.fn(),
        downloadUpdate: vi.fn(),
        getAppVersion: vi.fn().mockResolvedValue("0.1.0"),
        getAutoDownload: vi.fn().mockResolvedValue(true),
        setAutoDownload: vi.fn().mockResolvedValue(undefined),
      },
      menu: {
        onNavigate: () => () => {},
        onNotify: () => () => {},
        onConfirm: () => () => {},
        respondConfirm: vi.fn(),
        onOpenManual: (cb: () => void) => {
          openManualCb = cb;
          return () => {};
        },
      },
    };
  }

  beforeEach(() => {
    installHorizon();
  });

  afterEach(() => {
    delete window.horizon;
    vi.restoreAllMocks();
  });

  it("opens the drawer on the current screen, leaving the route and the screen beneath unchanged", () => {
    renderAtRoute("/");

    act(() => {
      openManualCb?.();
    });

    expect(
      screen.getByRole("dialog", { name: /user manual/i })
    ).toBeInTheDocument();
    expect(screen.getByText("Dashboard content")).toBeInTheDocument();
    expect(screen.getByTestId("pathname").textContent).toBe("/");
  });

  it("opens the same drawer the sidebar trigger does — never a second one", () => {
    renderAtRoute("/");

    act(() => {
      openManualCb?.();
    });
    expect(screen.getAllByRole("dialog")).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: /help & manual/i }));

    expect(screen.getAllByRole("dialog")).toHaveLength(1);
  });

  it("closes a menu-opened drawer on ESC, like a sidebar-opened one", () => {
    vi.useFakeTimers();
    renderAtRoute("/");

    act(() => {
      openManualCb?.();
    });
    expect(screen.getByRole("dialog")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    act(() => {
      vi.advanceTimersByTime(MANUAL_TRANSITION_MS);
    });

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
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
