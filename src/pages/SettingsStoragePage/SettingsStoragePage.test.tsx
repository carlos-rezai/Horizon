// @vitest-environment jsdom
import { render, screen, cleanup, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { ThemeProvider } from "styled-components";
import { describe, it, expect, afterEach, vi } from "vitest";
import { theme } from "../../tokens";
import SettingsStoragePage from "./SettingsStoragePage";

afterEach(() => {
  cleanup();
  delete window.horizon;
  vi.restoreAllMocks();
});

function renderPage() {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={["/settings/storage"]}>
        <SettingsStoragePage />
      </MemoryRouter>
    </ThemeProvider>
  );
}

function mockSuccess() {
  vi.spyOn(globalThis, "fetch").mockResolvedValue({
    ok: true,
    json: async () => ({
      driver: "sqlite",
      schemaVersion: 2,
      integrity: "ok",
      path: ":memory:",
      sizeBytes: 0,
    }),
  } as Response);
}

describe("SettingsStoragePage — smoke", () => {
  it("renders the Storage heading and the StorageStatus component", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => ({
        driver: "sqlite",
        schemaVersion: 2,
        integrity: "ok",
        path: ":memory:",
        sizeBytes: 0,
      }),
    } as Response);

    renderPage();

    expect(
      screen.getByRole("heading", { level: 1, name: /storage/i })
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText(/sqlite/i)).toBeInTheDocument();
    });
  });
});

describe("SettingsStoragePage — card surfaces", () => {
  it("renders the StorageStatus section inside a Card surface", async () => {
    mockSuccess();
    renderPage();
    await waitFor(() => {
      expect(screen.getAllByTestId("card").length).toBeGreaterThanOrEqual(1);
    });
  });
});

function mockHorizon() {
  window.horizon = {
    apiBaseUrl: "",
    platform: "win32",
    updates: {
      onUpdateDownloaded: () => () => {},
      quitAndInstall: vi.fn(),
      downloadUpdate: vi.fn(),
      getAppVersion: vi.fn().mockResolvedValue("0.1.0"),
      getAutoDownload: vi.fn().mockResolvedValue(true),
      setAutoDownload: vi.fn().mockResolvedValue(undefined),
    },
  };
}

describe("SettingsStoragePage — sections", () => {
  it("renders a Storage section using CardHeader", async () => {
    mockSuccess();
    mockHorizon();
    renderPage();
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 2, name: /storage/i })
      ).toBeInTheDocument();
    });
  });

  it("renders an Updates section using CardHeader", async () => {
    mockSuccess();
    mockHorizon();
    renderPage();
    await waitFor(() => {
      expect(
        screen.getByRole("heading", { level: 2, name: /updates/i })
      ).toBeInTheDocument();
    });
  });
});
