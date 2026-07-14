// @vitest-environment jsdom
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
} from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../tokens";
import AutoUpdateToggle from "./AutoUpdateToggle";

afterEach(() => {
  cleanup();
  delete window.horizon;
  vi.restoreAllMocks();
});

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

function makeHorizon(
  getAutoDownload: () => Promise<boolean>,
  setAutoDownload = vi.fn().mockResolvedValue(undefined)
) {
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
      getAutoDownload,
      setAutoDownload,
    },
    menu: {
      onNavigate: () => () => {},
      onNotify: () => () => {},
      onConfirm: () => () => {},
      respondConfirm: vi.fn(),
    },
  };
  return setAutoDownload;
}

describe("AutoUpdateToggle", () => {
  it("renders checked when getAutoDownload resolves true", async () => {
    makeHorizon(vi.fn().mockResolvedValue(true));
    renderWithTheme(<AutoUpdateToggle />);
    await waitFor(() => {
      expect(screen.getByRole("switch")).toBeChecked();
    });
  });

  it("renders unchecked when getAutoDownload resolves false", async () => {
    makeHorizon(vi.fn().mockResolvedValue(false));
    renderWithTheme(<AutoUpdateToggle />);
    await waitFor(() => {
      expect(screen.getByRole("switch")).not.toBeChecked();
    });
  });

  it("calls setAutoDownload(false) when toggled off", async () => {
    const setAutoDownload = makeHorizon(vi.fn().mockResolvedValue(true));
    renderWithTheme(<AutoUpdateToggle />);

    await waitFor(() => {
      expect(screen.getByRole("switch")).toBeChecked();
    });

    fireEvent.click(screen.getByRole("switch"));

    expect(setAutoDownload).toHaveBeenCalledWith(false);
  });
});
