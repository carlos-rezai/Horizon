import { describe, expect, it, vi } from "vitest";

import {
  restoreFromBackup,
  type RestoreFromBackupDeps,
} from "./restoreFromBackup";

function createDeps(
  overrides: Partial<RestoreFromBackupDeps> = {}
): RestoreFromBackupDeps {
  return {
    pickOpenPath: vi.fn().mockResolvedValue("C:/backups/mine.db"),
    confirm: vi.fn().mockResolvedValue(true),
    restoreFrom: vi.fn().mockResolvedValue(undefined),
    reloadWindow: vi.fn(),
    onError: vi.fn(),
    ...overrides,
  };
}

describe("restoreFromBackup", () => {
  describe("when the open picker is cancelled", () => {
    it("does nothing — no confirm, no restore, no reload", async () => {
      const deps = createDeps({
        pickOpenPath: vi.fn().mockResolvedValue(null),
      });

      await restoreFromBackup(deps);

      expect(deps.confirm).not.toHaveBeenCalled();
      expect(deps.restoreFrom).not.toHaveBeenCalled();
      expect(deps.reloadWindow).not.toHaveBeenCalled();
    });
  });

  describe("when the confirmation is declined", () => {
    it("does not restore and does not reload", async () => {
      const deps = createDeps({
        confirm: vi.fn().mockResolvedValue(false),
      });

      await restoreFromBackup(deps);

      expect(deps.restoreFrom).not.toHaveBeenCalled();
      expect(deps.reloadWindow).not.toHaveBeenCalled();
      expect(deps.onError).not.toHaveBeenCalled();
    });

    it("asks to confirm the chosen path", async () => {
      const deps = createDeps({
        pickOpenPath: vi.fn().mockResolvedValue("C:/backups/chosen.db"),
        confirm: vi.fn().mockResolvedValue(false),
      });

      await restoreFromBackup(deps);

      expect(deps.confirm).toHaveBeenCalledWith("C:/backups/chosen.db");
    });
  });

  describe("when the restore succeeds", () => {
    it("restores the chosen path and reloads the window", async () => {
      const deps = createDeps({
        pickOpenPath: vi.fn().mockResolvedValue("C:/backups/chosen.db"),
      });

      await restoreFromBackup(deps);

      expect(deps.restoreFrom).toHaveBeenCalledWith("C:/backups/chosen.db");
      expect(deps.reloadWindow).toHaveBeenCalledTimes(1);
      expect(deps.onError).not.toHaveBeenCalled();
    });
  });

  describe("when the restore fails", () => {
    it("reports the error and does not reload", async () => {
      const deps = createDeps({
        restoreFrom: vi
          .fn()
          .mockRejectedValue(new Error("source failed integrity check")),
      });

      await restoreFromBackup(deps);

      expect(deps.onError).toHaveBeenCalledWith(
        "source failed integrity check"
      );
      expect(deps.reloadWindow).not.toHaveBeenCalled();
    });

    it("does not throw when the restore rejects", async () => {
      const deps = createDeps({
        restoreFrom: vi.fn().mockRejectedValue(new Error("boom")),
      });

      await expect(restoreFromBackup(deps)).resolves.toBeUndefined();
    });
  });
});
