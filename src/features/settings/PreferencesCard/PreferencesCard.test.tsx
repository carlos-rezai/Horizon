// @vitest-environment jsdom
import {
  render,
  screen,
  cleanup,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../tokens";
import PreferencesCard from "./PreferencesCard";

afterEach(() => {
  cleanup();
  delete window.horizon;
  vi.restoreAllMocks();
});

function mockHorizon(autoDownload = true) {
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
      getAppVersion: vi.fn().mockResolvedValue("1.0.1"),
      getAutoDownload: vi.fn().mockResolvedValue(autoDownload),
      setAutoDownload: vi.fn().mockResolvedValue(undefined),
    },
    menu: {
      onNavigate: () => () => {},
      onNotify: () => () => {},
      onConfirm: () => () => {},
      respondConfirm: vi.fn(),
    },
  };
}

function renderCard() {
  return render(
    <ThemeProvider theme={theme}>
      <PreferencesCard />
    </ThemeProvider>
  );
}

describe("PreferencesCard", () => {
  it("renders the preference rows, including Categories", () => {
    mockHorizon();
    renderCard();

    expect(screen.getByText("Automatic updates")).toBeInTheDocument();
    expect(screen.getByText("Appearance")).toBeInTheDocument();
    expect(screen.getByText("Categories")).toBeInTheDocument();
    expect(screen.getByText("Privacy")).toBeInTheDocument();
  });

  it("opens the CategoryManagerModal from the Categories 'Manage' button", async () => {
    mockHorizon();
    vi.spyOn(globalThis, "fetch").mockResolvedValue({
      ok: true,
      json: async () => [],
    } as Response);
    renderCard();

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /manage/i }));

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeInTheDocument();
    });
  });

  it("wires the auto-update toggle to the loaded value", async () => {
    mockHorizon(true);
    renderCard();

    await waitFor(() => {
      expect(screen.getByRole("switch")).toBeChecked();
    });
  });

  it("shows the Appearance and Privacy badges", () => {
    mockHorizon();
    renderCard();

    expect(screen.getByText("Dark")).toBeInTheDocument();
    expect(screen.getByText("Local")).toBeInTheDocument();
  });
});
