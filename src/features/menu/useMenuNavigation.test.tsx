// @vitest-environment jsdom
import { render, screen, act, cleanup } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import { describe, it, expect, afterEach, vi } from "vitest";
import { useMenuNavigation } from "./useMenuNavigation";

afterEach(() => {
  cleanup();
  delete window.horizon;
  vi.restoreAllMocks();
});

type NavigateCb = (route: string) => void;

/**
 * Builds a `window.horizon` mock carrying the full existing bridge shape plus a
 * `menu.onNavigate` listener. `capture.cb` receives the callback the hook
 * registers so the test can drive a `menu:navigate` message; `capture.unsub`
 * records the returned unsubscribe function.
 */
function installHorizon(capture: {
  cb?: NavigateCb;
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
      onNavigate: (cb: NavigateCb) => {
        capture.cb = cb;
        return unsubscribe;
      },
      onNotify: () => () => {},
      onConfirm: () => () => {},
      respondConfirm: vi.fn(),
    },
  };
}

function LocationProbe() {
  const { pathname } = useLocation();
  return <div data-testid="pathname">{pathname}</div>;
}

function Harness() {
  useMenuNavigation();
  return <LocationProbe />;
}

function renderHarness() {
  return render(
    <MemoryRouter initialEntries={["/"]}>
      <Harness />
    </MemoryRouter>
  );
}

describe("useMenuNavigation", () => {
  it("subscribes to menu navigation on mount", () => {
    const capture: { cb?: NavigateCb; unsub?: () => void } = {};
    installHorizon(capture);

    renderHarness();

    expect(capture.cb).toBeTypeOf("function");
  });

  it("navigates the router to the route from a menu:navigate message", () => {
    const capture: { cb?: NavigateCb; unsub?: () => void } = {};
    installHorizon(capture);

    renderHarness();
    expect(screen.getByTestId("pathname").textContent).toBe("/");

    act(() => {
      capture.cb?.("/settings/storage");
    });

    expect(screen.getByTestId("pathname").textContent).toBe(
      "/settings/storage"
    );
  });

  it("unsubscribes on unmount", () => {
    const capture: { cb?: NavigateCb; unsub?: () => void } = {};
    installHorizon(capture);

    const { unmount } = renderHarness();
    expect(capture.unsub).not.toHaveBeenCalled();

    unmount();

    expect(capture.unsub).toHaveBeenCalledTimes(1);
  });

  it("is a safe no-op when window.horizon is absent", () => {
    expect(() => renderHarness()).not.toThrow();
    expect(screen.getByTestId("pathname").textContent).toBe("/");
  });
});
