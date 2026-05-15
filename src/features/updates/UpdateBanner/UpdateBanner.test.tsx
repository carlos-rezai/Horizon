// @vitest-environment jsdom
import {
  render,
  screen,
  cleanup,
  fireEvent,
  act,
} from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../tokens";
import UpdateBanner from "./UpdateBanner";

function renderWithTheme(ui: React.ReactElement) {
  return render(<ThemeProvider theme={theme}>{ui}</ThemeProvider>);
}

afterEach(() => {
  cleanup();
  delete window.horizon;
  vi.restoreAllMocks();
});

describe("UpdateBanner", () => {
  it("renders nothing when state is idle", () => {
    window.horizon = {
      apiBaseUrl: "",
      platform: "win32",
      electronVersion: "0.0.0",
      updates: {
        onUpdateDownloaded: () => () => {},
        onUpdateAvailable: () => () => {},
        quitAndInstall: vi.fn(),
        downloadUpdate: vi.fn(),
        getAppVersion: vi.fn().mockResolvedValue("0.1.0"),
        getAutoDownload: vi.fn().mockResolvedValue(true),
        setAutoDownload: vi.fn().mockResolvedValue(undefined),
      },
    };

    const { container } = renderWithTheme(<UpdateBanner />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders a Snackbar with 'Restart to update' when state is ready", () => {
    let registeredCb: (() => void) | null = null;
    window.horizon = {
      apiBaseUrl: "",
      platform: "win32",
      electronVersion: "0.0.0",
      updates: {
        onUpdateDownloaded: (cb) => {
          registeredCb = cb;
          return () => {};
        },
        onUpdateAvailable: () => () => {},
        quitAndInstall: vi.fn(),
        downloadUpdate: vi.fn(),
        getAppVersion: vi.fn().mockResolvedValue("0.1.0"),
        getAutoDownload: vi.fn().mockResolvedValue(true),
        setAutoDownload: vi.fn().mockResolvedValue(undefined),
      },
    };

    renderWithTheme(<UpdateBanner />);
    expect(
      screen.queryByRole("button", { name: "Restart to update" })
    ).not.toBeInTheDocument();

    act(() => {
      registeredCb?.();
    });

    expect(
      screen.getByRole("button", { name: "Restart to update" })
    ).toBeInTheDocument();
  });

  it("hides the banner when the close button is clicked", () => {
    let registeredCb: (() => void) | null = null;
    window.horizon = {
      apiBaseUrl: "",
      platform: "win32",
      electronVersion: "0.0.0",
      updates: {
        onUpdateDownloaded: (cb) => {
          registeredCb = cb;
          return () => {};
        },
        onUpdateAvailable: () => () => {},
        quitAndInstall: vi.fn(),
        downloadUpdate: vi.fn(),
        getAppVersion: vi.fn().mockResolvedValue("0.1.0"),
        getAutoDownload: vi.fn().mockResolvedValue(true),
        setAutoDownload: vi.fn().mockResolvedValue(undefined),
      },
    };

    renderWithTheme(<UpdateBanner />);

    act(() => {
      registeredCb?.();
    });

    expect(
      screen.getByRole("button", { name: "Restart to update" })
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: /close/i }));

    expect(
      screen.queryByRole("button", { name: "Restart to update" })
    ).not.toBeInTheDocument();
  });

  it("renders a Snackbar with 'Download' action when state is available", () => {
    let registeredAvailableCb: (() => void) | null = null;
    window.horizon = {
      apiBaseUrl: "",
      platform: "win32",
      electronVersion: "0.0.0",
      updates: {
        onUpdateDownloaded: () => () => {},
        onUpdateAvailable: (cb) => {
          registeredAvailableCb = cb;
          return () => {};
        },
        quitAndInstall: vi.fn(),
        downloadUpdate: vi.fn(),
        getAppVersion: vi.fn().mockResolvedValue("0.1.0"),
        getAutoDownload: vi.fn().mockResolvedValue(true),
        setAutoDownload: vi.fn().mockResolvedValue(undefined),
      },
    };

    renderWithTheme(<UpdateBanner />);
    expect(
      screen.queryByRole("button", { name: "Download" })
    ).not.toBeInTheDocument();

    act(() => {
      registeredAvailableCb?.();
    });

    expect(
      screen.getByRole("button", { name: "Download" })
    ).toBeInTheDocument();
  });

  it("clicking Download calls downloadUpdate", () => {
    let registeredAvailableCb: (() => void) | null = null;
    const downloadUpdate = vi.fn();
    window.horizon = {
      apiBaseUrl: "",
      platform: "win32",
      electronVersion: "0.0.0",
      updates: {
        onUpdateDownloaded: () => () => {},
        onUpdateAvailable: (cb) => {
          registeredAvailableCb = cb;
          return () => {};
        },
        quitAndInstall: vi.fn(),
        downloadUpdate,
        getAppVersion: vi.fn().mockResolvedValue("0.1.0"),
        getAutoDownload: vi.fn().mockResolvedValue(true),
        setAutoDownload: vi.fn().mockResolvedValue(undefined),
      },
    };

    renderWithTheme(<UpdateBanner />);

    act(() => {
      registeredAvailableCb?.();
    });

    fireEvent.click(screen.getByRole("button", { name: "Download" }));

    expect(downloadUpdate).toHaveBeenCalledTimes(1);
  });

  it("transitions from available to ready after download completes", () => {
    let registeredAvailableCb: (() => void) | null = null;
    let registeredDownloadedCb: (() => void) | null = null;
    window.horizon = {
      apiBaseUrl: "",
      platform: "win32",
      electronVersion: "0.0.0",
      updates: {
        onUpdateDownloaded: (cb) => {
          registeredDownloadedCb = cb;
          return () => {};
        },
        onUpdateAvailable: (cb) => {
          registeredAvailableCb = cb;
          return () => {};
        },
        quitAndInstall: vi.fn(),
        downloadUpdate: vi.fn(),
        getAppVersion: vi.fn().mockResolvedValue("0.1.0"),
        getAutoDownload: vi.fn().mockResolvedValue(true),
        setAutoDownload: vi.fn().mockResolvedValue(undefined),
      },
    };

    renderWithTheme(<UpdateBanner />);

    act(() => {
      registeredAvailableCb?.();
    });
    expect(
      screen.getByRole("button", { name: "Download" })
    ).toBeInTheDocument();

    act(() => {
      registeredDownloadedCb?.();
    });
    expect(
      screen.queryByRole("button", { name: "Download" })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Restart to update" })
    ).toBeInTheDocument();
  });
});
