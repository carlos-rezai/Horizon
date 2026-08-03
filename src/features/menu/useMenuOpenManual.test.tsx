// @vitest-environment jsdom
import { render, act, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { useMenuOpenManual } from "./useMenuOpenManual";

afterEach(() => {
  cleanup();
  delete window.horizon;
  vi.restoreAllMocks();
});

type OpenManualCb = () => void;

/**
 * Builds a `window.horizon` mock carrying the full existing bridge shape plus a
 * `menu.onOpenManual` listener. `capture.cb` receives the callback the hook
 * registers so the test can drive a `menu:open-manual` message; `capture.unsub`
 * records the returned unsubscribe function.
 */
function installHorizon(capture: {
  cb?: OpenManualCb;
  unsub?: () => void;
}): void {
  const unsubscribe = vi.fn();
  capture.unsub = unsubscribe;
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
      onOpenManual: (cb: OpenManualCb) => {
        capture.cb = cb;
        return unsubscribe;
      },
    },
  };
}

function renderHarness(open: () => void) {
  function Harness() {
    useMenuOpenManual(open);
    return null;
  }
  return render(<Harness />);
}

describe("useMenuOpenManual", () => {
  it("subscribes to the manual channel on mount", () => {
    const capture: { cb?: OpenManualCb; unsub?: () => void } = {};
    installHorizon(capture);

    renderHarness(vi.fn());

    expect(capture.cb).toBeTypeOf("function");
  });

  it("opens the drawer when a menu:open-manual message arrives", () => {
    const capture: { cb?: OpenManualCb; unsub?: () => void } = {};
    installHorizon(capture);
    const open = vi.fn();

    renderHarness(open);
    expect(open).not.toHaveBeenCalled();

    act(() => {
      capture.cb?.();
    });

    expect(open).toHaveBeenCalledTimes(1);
  });

  it("unsubscribes on unmount", () => {
    const capture: { cb?: OpenManualCb; unsub?: () => void } = {};
    installHorizon(capture);

    const { unmount } = renderHarness(vi.fn());
    expect(capture.unsub).not.toHaveBeenCalled();

    unmount();

    expect(capture.unsub).toHaveBeenCalledTimes(1);
  });

  it("is a safe no-op when window.horizon is absent", () => {
    const open = vi.fn();

    expect(() => renderHarness(open)).not.toThrow();
    expect(open).not.toHaveBeenCalled();
  });
});
