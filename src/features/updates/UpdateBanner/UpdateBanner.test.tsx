// @vitest-environment jsdom
import {
  render,
  screen,
  cleanup,
  fireEvent,
  act,
} from "@testing-library/react";
import {
  describe,
  it,
  expect,
  afterEach,
  beforeEach,
  vi,
  type Mock,
} from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../../tokens";
import SnackbarProvider from "../../../components/SnackbarProvider/SnackbarProvider";
import AlertProvider from "../../../components/AlertProvider/AlertProvider";
import UpdateBanner from "./UpdateBanner";
import type { ManualUpdateResult } from "../../../types/horizon";

type VoidCb = () => void;
type ManualCb = (result: ManualUpdateResult) => void;

interface Capture {
  downloadedCb?: VoidCb;
  availableCb?: VoidCb;
  manualCb?: ManualCb;
  downloadUpdate: Mock<() => void>;
  quitAndInstall: Mock<() => void>;
}

// Installs a window.horizon that captures the update subscriptions so a test
// can drive the auto-update and manual-check channels independently.
function installHorizon(): Capture {
  const capture: Capture = {
    downloadUpdate: vi.fn<() => void>(),
    quitAndInstall: vi.fn<() => void>(),
  };
  window.horizon = {
    apiBaseUrl: "",
    platform: "win32",
    electronVersion: "0.0.0",
    updates: {
      onUpdateDownloaded: (cb) => {
        capture.downloadedCb = cb;
        return () => {};
      },
      onUpdateAvailable: (cb) => {
        capture.availableCb = cb;
        return () => {};
      },
      onManualResult: (cb) => {
        capture.manualCb = cb;
        return () => {};
      },
      quitAndInstall: capture.quitAndInstall,
      downloadUpdate: capture.downloadUpdate,
      getAppVersion: vi.fn().mockResolvedValue("0.1.0"),
      getAutoDownload: vi.fn().mockResolvedValue(true),
      setAutoDownload: vi.fn().mockResolvedValue(undefined),
    },
    menu: {
      onNavigate: () => () => {},
      onNotify: () => () => {},
      onConfirm: () => () => {},
      respondConfirm: vi.fn(),
    },
  };
  return capture;
}

function renderBanner() {
  return render(
    <ThemeProvider theme={theme}>
      <SnackbarProvider>
        <AlertProvider>
          <UpdateBanner />
        </AlertProvider>
      </SnackbarProvider>
    </ThemeProvider>
  );
}

afterEach(() => {
  cleanup();
  delete window.horizon;
  vi.restoreAllMocks();
});

describe("UpdateBanner — auto-update banner", () => {
  it("shows no update affordance when idle", () => {
    installHorizon();
    renderBanner();
    expect(
      screen.queryByRole("button", { name: "Restart to update" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Download" })
    ).not.toBeInTheDocument();
  });

  it("renders a Snackbar with 'Restart to update' when ready", () => {
    const capture = installHorizon();
    renderBanner();
    act(() => {
      capture.downloadedCb?.();
    });
    expect(
      screen.getByRole("button", { name: "Restart to update" })
    ).toBeInTheDocument();
  });

  it("hides the banner when the close button is clicked", () => {
    const capture = installHorizon();
    renderBanner();
    act(() => {
      capture.downloadedCb?.();
    });
    expect(
      screen.getByRole("button", { name: "Restart to update" })
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /close/i }));
    expect(
      screen.queryByRole("button", { name: "Restart to update" })
    ).not.toBeInTheDocument();
  });

  it("renders a 'Download' action when available", () => {
    const capture = installHorizon();
    renderBanner();
    act(() => {
      capture.availableCb?.();
    });
    expect(
      screen.getByRole("button", { name: "Download" })
    ).toBeInTheDocument();
  });

  it("clicking Download calls downloadUpdate", () => {
    const capture = installHorizon();
    renderBanner();
    act(() => {
      capture.availableCb?.();
    });
    fireEvent.click(screen.getByRole("button", { name: "Download" }));
    expect(capture.downloadUpdate).toHaveBeenCalledTimes(1);
  });

  it("transitions from available to ready after download completes", () => {
    const capture = installHorizon();
    renderBanner();
    act(() => {
      capture.availableCb?.();
    });
    expect(
      screen.getByRole("button", { name: "Download" })
    ).toBeInTheDocument();
    act(() => {
      capture.downloadedCb?.();
    });
    expect(
      screen.queryByRole("button", { name: "Download" })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Restart to update" })
    ).toBeInTheDocument();
  });
});

describe("UpdateBanner — manual check outcomes", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it("shows a transient info snackbar while checking", () => {
    const capture = installHorizon();
    renderBanner();
    act(() => {
      capture.manualCb?.({ state: "checking" });
    });
    const snack = screen.getByRole("status");
    expect(snack).toHaveAttribute("data-variant", "info");
    expect(snack).toHaveTextContent("Checking for updates…");
  });

  it("shows a transient success snackbar with the up-to-date message", () => {
    const capture = installHorizon();
    renderBanner();
    act(() => {
      capture.manualCb?.({
        state: "uptodate",
        message: "Horizon 1.0.1 is the latest version.",
      });
    });
    const snack = screen.getByRole("status");
    expect(snack).toHaveAttribute("data-variant", "success");
    expect(snack).toHaveTextContent("Horizon 1.0.1 is the latest version.");
  });

  it("raises a blocking alert modal on a check error", () => {
    const capture = installHorizon();
    renderBanner();
    act(() => {
      capture.manualCb?.({
        state: "error",
        message: "net::ERR_INTERNET_DISCONNECTED",
      });
    });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByText("Horizon could not check for updates.")
    ).toBeInTheDocument();
    expect(
      screen.getByText("net::ERR_INTERNET_DISCONNECTED")
    ).toBeInTheDocument();
  });

  it("does not render a persistent banner for a manual outcome", () => {
    const capture = installHorizon();
    renderBanner();
    act(() => {
      capture.manualCb?.({ state: "uptodate", message: "Up to date." });
    });
    expect(
      screen.queryByRole("button", { name: "Restart to update" })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Download" })
    ).not.toBeInTheDocument();
  });
});
