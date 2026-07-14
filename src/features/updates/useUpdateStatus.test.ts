// @vitest-environment jsdom
import { renderHook, act, cleanup } from "@testing-library/react";
import { describe, it, expect, afterEach, vi } from "vitest";
import { useUpdateStatus } from "./useUpdateStatus";

afterEach(() => {
  cleanup();
  delete window.horizon;
  vi.restoreAllMocks();
});

describe("useUpdateStatus", () => {
  it("initial state is idle", () => {
    window.horizon = {
      apiBaseUrl: "",
      platform: "win32",
      electronVersion: "0.0.0",
      updates: {
        onUpdateDownloaded: () => () => {},
        onUpdateAvailable: () => () => {},
        quitAndInstall: vi.fn(),
        downloadUpdate: vi.fn(),
        onManualResult: () => () => {},
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

    const { result } = renderHook(() => useUpdateStatus());
    expect(result.current.state).toBe("idle");
  });

  it("transitions to ready when the downloaded callback fires", () => {
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
        onManualResult: () => () => {},
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

    const { result } = renderHook(() => useUpdateStatus());
    expect(result.current.state).toBe("idle");

    act(() => {
      registeredCb?.();
    });

    expect(result.current.state).toBe("ready");
  });

  it("install() calls window.horizon.updates.quitAndInstall", () => {
    const quitAndInstall = vi.fn();
    window.horizon = {
      apiBaseUrl: "",
      platform: "win32",
      electronVersion: "0.0.0",
      updates: {
        onUpdateDownloaded: () => () => {},
        onUpdateAvailable: () => () => {},
        quitAndInstall,
        downloadUpdate: vi.fn(),
        onManualResult: () => () => {},
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

    const { result } = renderHook(() => useUpdateStatus());

    act(() => {
      result.current.install();
    });

    expect(quitAndInstall).toHaveBeenCalledTimes(1);
  });

  it("transitions to available when the available callback fires", () => {
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
        onManualResult: () => () => {},
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

    const { result } = renderHook(() => useUpdateStatus());
    expect(result.current.state).toBe("idle");

    act(() => {
      registeredAvailableCb?.();
    });

    expect(result.current.state).toBe("available");
  });

  it("download() calls window.horizon.updates.downloadUpdate", () => {
    const downloadUpdate = vi.fn();
    window.horizon = {
      apiBaseUrl: "",
      platform: "win32",
      electronVersion: "0.0.0",
      updates: {
        onUpdateDownloaded: () => () => {},
        onUpdateAvailable: () => () => {},
        quitAndInstall: vi.fn(),
        downloadUpdate,
        onManualResult: () => () => {},
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

    const { result } = renderHook(() => useUpdateStatus());

    act(() => {
      result.current.download();
    });

    expect(downloadUpdate).toHaveBeenCalledTimes(1);
  });

  it("transitions from available to ready when the downloaded callback fires", () => {
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
        onManualResult: () => () => {},
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

    const { result } = renderHook(() => useUpdateStatus());

    act(() => {
      registeredAvailableCb?.();
    });
    expect(result.current.state).toBe("available");

    act(() => {
      registeredDownloadedCb?.();
    });
    expect(result.current.state).toBe("ready");
  });

  it("reflects a manual up-to-date result with its message", () => {
    let registeredManualCb:
      | ((result: { state: "uptodate"; message?: string }) => void)
      | null = null;
    window.horizon = {
      apiBaseUrl: "",
      platform: "win32",
      electronVersion: "0.0.0",
      updates: {
        onUpdateDownloaded: () => () => {},
        onUpdateAvailable: () => () => {},
        onManualResult: (cb) => {
          registeredManualCb = cb;
          return () => {};
        },
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
      },
    };

    const { result } = renderHook(() => useUpdateStatus());

    act(() => {
      registeredManualCb?.({
        state: "uptodate",
        message: "Horizon 1.0.1 is the latest version.",
      });
    });

    expect(result.current.state).toBe("uptodate");
    expect(result.current.message).toBe("Horizon 1.0.1 is the latest version.");
  });

  it("reflects a manual check error with its message", () => {
    let registeredManualCb:
      | ((result: { state: "error"; message?: string }) => void)
      | null = null;
    window.horizon = {
      apiBaseUrl: "",
      platform: "win32",
      electronVersion: "0.0.0",
      updates: {
        onUpdateDownloaded: () => () => {},
        onUpdateAvailable: () => () => {},
        onManualResult: (cb) => {
          registeredManualCb = cb;
          return () => {};
        },
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
      },
    };

    const { result } = renderHook(() => useUpdateStatus());

    act(() => {
      registeredManualCb?.({ state: "error", message: "offline" });
    });

    expect(result.current.state).toBe("error");
    expect(result.current.message).toBe("offline");
  });
});
