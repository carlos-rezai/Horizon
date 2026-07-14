// @vitest-environment jsdom
import {
  render,
  screen,
  act,
  cleanup,
  fireEvent,
  waitFor,
} from "@testing-library/react";
import { describe, it, expect, afterEach, vi, type Mock } from "vitest";
import { ThemeProvider } from "styled-components";
import { theme } from "../../tokens";
import SnackbarProvider from "../../components/SnackbarProvider/SnackbarProvider";
import AlertProvider from "../../components/AlertProvider/AlertProvider";
import ConfirmProvider from "../../components/ConfirmProvider/ConfirmProvider";
import { useMenuDialogs } from "./useMenuDialogs";
import type { MenuNotification, MenuConfirmRequest } from "../../types/horizon";

type NotifyCb = (notification: MenuNotification) => void;
type ConfirmCb = (request: MenuConfirmRequest) => void;

interface Capture {
  notifyCb?: NotifyCb;
  confirmCb?: ConfirmCb;
  respondConfirm: Mock<(id: number, confirmed: boolean) => void>;
  unsubscribeNotify: Mock<() => void>;
  unsubscribeConfirm: Mock<() => void>;
}

// Builds a window.horizon carrying the full bridge shape, capturing the
// callbacks the host registers so a test can drive menu:notify / menu:confirm.
function installHorizon(): Capture {
  const capture: Capture = {
    respondConfirm: vi.fn<(id: number, confirmed: boolean) => void>(),
    unsubscribeNotify: vi.fn<() => void>(),
    unsubscribeConfirm: vi.fn<() => void>(),
  };
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
      onNotify: (cb: NotifyCb) => {
        capture.notifyCb = cb;
        return capture.unsubscribeNotify;
      },
      onConfirm: (cb: ConfirmCb) => {
        capture.confirmCb = cb;
        return capture.unsubscribeConfirm;
      },
      respondConfirm: capture.respondConfirm,
    },
  };
  return capture;
}

function Harness() {
  useMenuDialogs();
  return null;
}

function renderHost() {
  return render(
    <ThemeProvider theme={theme}>
      <SnackbarProvider>
        <AlertProvider>
          <ConfirmProvider>
            <Harness />
          </ConfirmProvider>
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

describe("useMenuDialogs — notifications", () => {
  it("routes a success notification to a snackbar", () => {
    const capture = installHorizon();
    renderHost();
    act(() => {
      capture.notifyCb?.({
        tone: "success",
        title: "Backup created",
        message: "Your backup was created.",
      });
    });
    expect(screen.getByText("Your backup was created.")).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveAttribute(
      "data-variant",
      "success"
    );
  });

  it("routes an info notification to a snackbar", () => {
    const capture = installHorizon();
    renderHost();
    act(() => {
      capture.notifyCb?.({
        tone: "info",
        title: "Heads up",
        message: "Something informational.",
      });
    });
    expect(screen.getByRole("status")).toHaveAttribute("data-variant", "info");
  });

  it("routes an error notification to a blocking alert modal", () => {
    const capture = installHorizon();
    renderHost();
    act(() => {
      capture.notifyCb?.({
        tone: "error",
        title: "Backup failed",
        message: "Horizon could not create the backup.",
        detail: "EACCES: permission denied",
      });
    });
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Backup failed")).toBeInTheDocument();
    expect(
      screen.getByText("Horizon could not create the backup.")
    ).toBeInTheDocument();
    expect(screen.getByText("EACCES: permission denied")).toBeInTheDocument();
    // An error must not be a transient snackbar.
    expect(screen.queryByRole("status")).toBeNull();
  });
});

describe("useMenuDialogs — confirmations", () => {
  it("opens a confirm modal and replies true when confirmed", async () => {
    const capture = installHorizon();
    renderHost();
    act(() => {
      capture.confirmCb?.({
        id: 7,
        title: "Start Fresh",
        message: "Erase everything?",
        tone: "danger",
        confirmLabel: "Erase everything",
      });
    });
    expect(screen.getByText("Start Fresh")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Erase everything" }));
    await waitFor(() => {
      expect(capture.respondConfirm).toHaveBeenCalledWith(7, true);
    });
  });

  it("replies false when the confirm is cancelled", async () => {
    const capture = installHorizon();
    renderHost();
    act(() => {
      capture.confirmCb?.({
        id: 9,
        title: "Start Fresh",
        message: "Erase everything?",
      });
    });
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    await waitFor(() => {
      expect(capture.respondConfirm).toHaveBeenCalledWith(9, false);
    });
  });
});

describe("useMenuDialogs — lifecycle", () => {
  it("unsubscribes from both channels on unmount", () => {
    const capture = installHorizon();
    const { unmount } = renderHost();
    expect(capture.unsubscribeNotify).not.toHaveBeenCalled();
    expect(capture.unsubscribeConfirm).not.toHaveBeenCalled();
    unmount();
    expect(capture.unsubscribeNotify).toHaveBeenCalledTimes(1);
    expect(capture.unsubscribeConfirm).toHaveBeenCalledTimes(1);
  });

  it("is a safe no-op when window.horizon is absent", () => {
    expect(() => renderHost()).not.toThrow();
  });
});
