import { describe, expect, it, vi } from "vitest";

import {
  runManualUpdateCheck,
  type ManualUpdateCheckDeps,
} from "./runManualUpdateCheck";

function createDeps(
  overrides: Partial<ManualUpdateCheckDeps> = {}
): ManualUpdateCheckDeps {
  return {
    isPackaged: true,
    checkForUpdates: vi.fn().mockResolvedValue({ isUpdateAvailable: false }),
    onUpToDate: vi.fn(),
    onError: vi.fn(),
    onDevUnavailable: vi.fn(),
    ...overrides,
  };
}

describe("runManualUpdateCheck", () => {
  describe("when running unpackaged/dev", () => {
    it("shows the dev-unavailable notice", async () => {
      const deps = createDeps({ isPackaged: false });

      await runManualUpdateCheck(deps);

      expect(deps.onDevUnavailable).toHaveBeenCalledTimes(1);
    });

    it("does not attempt a real update check", async () => {
      const deps = createDeps({ isPackaged: false });

      await runManualUpdateCheck(deps);

      expect(deps.checkForUpdates).not.toHaveBeenCalled();
    });

    it("shows no up-to-date or error box", async () => {
      const deps = createDeps({ isPackaged: false });

      await runManualUpdateCheck(deps);

      expect(deps.onUpToDate).not.toHaveBeenCalled();
      expect(deps.onError).not.toHaveBeenCalled();
    });
  });

  describe("when packaged", () => {
    it("triggers a real update check", async () => {
      const deps = createDeps();

      await runManualUpdateCheck(deps);

      expect(deps.checkForUpdates).toHaveBeenCalledTimes(1);
      expect(deps.onDevUnavailable).not.toHaveBeenCalled();
    });
  });

  describe("when an update is available", () => {
    it("defers to the in-app banner and shows no native box", async () => {
      const deps = createDeps({
        checkForUpdates: vi.fn().mockResolvedValue({ isUpdateAvailable: true }),
      });

      await runManualUpdateCheck(deps);

      expect(deps.checkForUpdates).toHaveBeenCalledTimes(1);
      expect(deps.onUpToDate).not.toHaveBeenCalled();
      expect(deps.onError).not.toHaveBeenCalled();
      expect(deps.onDevUnavailable).not.toHaveBeenCalled();
    });
  });

  describe("when already on the latest version", () => {
    it("shows the up-to-date box", async () => {
      const deps = createDeps({
        checkForUpdates: vi
          .fn()
          .mockResolvedValue({ isUpdateAvailable: false }),
      });

      await runManualUpdateCheck(deps);

      expect(deps.onUpToDate).toHaveBeenCalledTimes(1);
      expect(deps.onError).not.toHaveBeenCalled();
    });

    it("treats a null check result as up to date", async () => {
      const deps = createDeps({
        checkForUpdates: vi.fn().mockResolvedValue(null),
      });

      await runManualUpdateCheck(deps);

      expect(deps.onUpToDate).toHaveBeenCalledTimes(1);
      expect(deps.onError).not.toHaveBeenCalled();
    });
  });

  describe("when the check fails", () => {
    it("shows the error box with the failure message", async () => {
      const deps = createDeps({
        checkForUpdates: vi
          .fn()
          .mockRejectedValue(new Error("net::ERR_INTERNET_DISCONNECTED")),
      });

      await runManualUpdateCheck(deps);

      expect(deps.onError).toHaveBeenCalledTimes(1);
      expect(deps.onError).toHaveBeenCalledWith(
        "net::ERR_INTERNET_DISCONNECTED"
      );
      expect(deps.onUpToDate).not.toHaveBeenCalled();
    });

    it("does not throw when the check rejects", async () => {
      const deps = createDeps({
        checkForUpdates: vi.fn().mockRejectedValue(new Error("offline")),
      });

      await expect(runManualUpdateCheck(deps)).resolves.toBeUndefined();
    });
  });
});
