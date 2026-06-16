// @vitest-environment jsdom
import {
  render,
  screen,
  cleanup,
  waitFor,
  fireEvent,
} from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { describe, it, expect, afterEach, vi } from "vitest";
import { theme } from "../../tokens";
import SnackbarProvider from "../../components/SnackbarProvider/SnackbarProvider";
import SettingsStoragePage from "./SettingsStoragePage";

afterEach(() => {
  cleanup();
  delete window.horizon;
  vi.restoreAllMocks();
});

function renderPage() {
  return render(
    <ThemeProvider theme={theme}>
      <SnackbarProvider>
        <MemoryRouter initialEntries={["/settings/storage"]}>
          <SettingsStoragePage />
        </MemoryRouter>
      </SnackbarProvider>
    </ThemeProvider>
  );
}

interface StatusOverrides {
  driver?: "sqlite" | "mongo";
  schemaVersion?: number;
  integrity?: string;
  path?: string;
  sizeBytes?: number;
}

function mockStatus(overrides: StatusOverrides = {}) {
  vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    json: async () => ({
      driver: "sqlite",
      schemaVersion: 7,
      integrity: "ok",
      path: "C:\\Users\\Carlos\\AppData\\Roaming\\Horizon\\horizon.db",
      sizeBytes: 5_242_880,
      ...overrides,
    }),
  } as Response);
}

function mockHorizon(
  overrides: { appVersion?: string; autoDownload?: boolean } = {}
) {
  const setAutoDownload = vi.fn().mockResolvedValue(undefined);
  window.horizon = {
    apiBaseUrl: "",
    platform: "win32",
    electronVersion: "0.0.0",
    updates: {
      onUpdateDownloaded: () => () => {},
      onUpdateAvailable: () => () => {},
      quitAndInstall: vi.fn(),
      downloadUpdate: vi.fn(),
      getAppVersion: vi.fn().mockResolvedValue(overrides.appVersion ?? "1.4.2"),
      getAutoDownload: vi
        .fn()
        .mockResolvedValue(overrides.autoDownload ?? true),
      setAutoDownload,
    },
  };
  return { setAutoDownload };
}

describe("SettingsStoragePage — shell", () => {
  it("renders the 'System' overline and 'Settings' title", async () => {
    mockStatus();
    mockHorizon();
    renderPage();

    expect(
      screen.getByRole("heading", { level: 1, name: /settings/i })
    ).toBeInTheDocument();
    expect(screen.getByText(/system/i)).toBeInTheDocument();
  });
});

describe("SettingsStoragePage — storage card (real data)", () => {
  it("shows the real database path from storage status", async () => {
    mockStatus({
      path: "C:\\Users\\Carlos\\AppData\\Roaming\\Horizon\\horizon.db",
    });
    mockHorizon();
    renderPage();

    await waitFor(() => {
      expect(
        screen.getByText(
          /C:\\Users\\Carlos\\AppData\\Roaming\\Horizon\\horizon\.db/
        )
      ).toBeInTheDocument();
    });
  });

  it("derives the database size from sizeBytes (not a hardcoded value)", async () => {
    // 5_242_880 bytes → "5 MB"; the prototype's mock "2,4 MB" must not appear.
    mockStatus({ sizeBytes: 5_242_880 });
    mockHorizon();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/5 MB/)).toBeInTheDocument();
    });
    expect(screen.queryByText(/2,4 MB/)).not.toBeInTheDocument();
  });

  it("shows an integrity indicator reflecting the real status", async () => {
    mockStatus({ integrity: "ok" });
    mockHorizon();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/integrity ok/i)).toBeInTheDocument();
    });
  });

  it("renders backup and restore controls", async () => {
    mockStatus();
    mockHorizon();
    renderPage();

    await waitFor(() => {
      const labels = screen
        .getAllByRole("button")
        .map((b) => (b.textContent ?? "").toLowerCase());
      expect(labels.some((t) => t.includes("backup"))).toBe(true);
      expect(labels.some((t) => t.includes("restore"))).toBe(true);
    });
  });
});

describe("SettingsStoragePage — preferences (real data)", () => {
  it("reflects the real auto-download value and persists a toggle", async () => {
    mockStatus();
    const { setAutoDownload } = mockHorizon({ autoDownload: true });
    renderPage();

    const toggle = await screen.findByRole("switch");
    expect(toggle).toBeChecked();

    fireEvent.click(toggle);
    expect(setAutoDownload).toHaveBeenCalledWith(false);
  });
});

describe("SettingsStoragePage — about (real data)", () => {
  it("shows the real app version", async () => {
    mockStatus();
    mockHorizon({ appVersion: "1.4.2" });
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/1\.4\.2/)).toBeInTheDocument();
    });
  });
});

describe("SettingsStoragePage — snackbar-preview demo card removed", () => {
  it("does not render the prototype's snackbar-preview demo card", async () => {
    mockStatus();
    mockHorizon();
    renderPage();

    await waitFor(() => {
      expect(screen.getByText(/system/i)).toBeInTheDocument();
    });

    expect(screen.queryByText(/snackbar states/i)).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^info$/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^success$/i })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: /^warning$/i })
    ).not.toBeInTheDocument();
  });
});
