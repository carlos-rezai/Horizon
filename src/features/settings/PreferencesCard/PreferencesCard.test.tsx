// @vitest-environment jsdom
import { render, screen, cleanup, waitFor } from "@testing-library/react";
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
      quitAndInstall: vi.fn(),
      downloadUpdate: vi.fn(),
      getAppVersion: vi.fn().mockResolvedValue("1.0.1"),
      getAutoDownload: vi.fn().mockResolvedValue(autoDownload),
      setAutoDownload: vi.fn().mockResolvedValue(undefined),
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
  it("renders the three preference rows", () => {
    mockHorizon();
    renderCard();

    expect(screen.getByText("Automatic updates")).toBeInTheDocument();
    expect(screen.getByText("Appearance")).toBeInTheDocument();
    expect(screen.getByText("Privacy")).toBeInTheDocument();
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
