// @vitest-environment jsdom
import { describe, it, expect, afterEach, vi } from "vitest";
import { subscribeToMenu } from "./subscribeToMenu";

afterEach(() => {
  delete window.horizon;
  vi.restoreAllMocks();
});

/** The full bridge shape, with `menu` present — what a packaged app gives the
 *  renderer. The channels themselves are irrelevant here; the helper only ever
 *  hands the bridge on. */
function installHorizon(): void {
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
      onOpenManual: () => () => {},
    },
  };
}

describe("subscribeToMenu", () => {
  it("subscribes through the bridge when Electron is behind the renderer", () => {
    installHorizon();
    const subscribe = vi.fn(() => vi.fn());

    subscribeToMenu(subscribe);

    expect(subscribe).toHaveBeenCalledTimes(1);
    expect(subscribe).toHaveBeenCalledWith(window.horizon!.menu);
  });

  it("hands back the channel's own unsubscribe, so the caller can return it from an effect", () => {
    installHorizon();
    const unsubscribe = vi.fn();

    const returned = subscribeToMenu(() => unsubscribe);
    returned();

    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it("never subscribes without the bridge, so the browser dev server is not a crash", () => {
    const subscribe = vi.fn(() => vi.fn());

    subscribeToMenu(subscribe);

    expect(subscribe).not.toHaveBeenCalled();
  });

  it("still returns a callable unsubscribe without the bridge", () => {
    const returned = subscribeToMenu(() => vi.fn());

    expect(returned).toBeTypeOf("function");
    expect(() => returned()).not.toThrow();
  });
});
