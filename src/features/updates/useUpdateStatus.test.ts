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
      updates: {
        onUpdateDownloaded: () => () => {},
        quitAndInstall: vi.fn(),
        downloadUpdate: vi.fn(),
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
      updates: {
        onUpdateDownloaded: (cb) => {
          registeredCb = cb;
          return () => {};
        },
        quitAndInstall: vi.fn(),
        downloadUpdate: vi.fn(),
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
      updates: {
        onUpdateDownloaded: () => () => {},
        quitAndInstall,
        downloadUpdate: vi.fn(),
      },
    };

    const { result } = renderHook(() => useUpdateStatus());

    act(() => {
      result.current.install();
    });

    expect(quitAndInstall).toHaveBeenCalledTimes(1);
  });
});
