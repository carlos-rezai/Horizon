import { describe, expect, it, vi } from "vitest";

import { createBackup, type CreateBackupDeps } from "./createBackup";

function createDeps(
  overrides: Partial<CreateBackupDeps> = {}
): CreateBackupDeps {
  return {
    pickSavePath: vi.fn().mockResolvedValue("C:/backups/horizon-backup.db"),
    backupTo: vi.fn().mockResolvedValue(undefined),
    onSuccess: vi.fn(),
    onError: vi.fn(),
    ...overrides,
  };
}

describe("createBackup", () => {
  describe("when the save picker is cancelled", () => {
    it("does nothing — no backup, no notification", async () => {
      const deps = createDeps({
        pickSavePath: vi.fn().mockResolvedValue(null),
      });

      await createBackup(deps);

      expect(deps.backupTo).not.toHaveBeenCalled();
      expect(deps.onSuccess).not.toHaveBeenCalled();
      expect(deps.onError).not.toHaveBeenCalled();
    });
  });

  describe("when the backup succeeds", () => {
    it("writes to the chosen path and reports success with that path", async () => {
      const deps = createDeps({
        pickSavePath: vi.fn().mockResolvedValue("C:/backups/mine.db"),
      });

      await createBackup(deps);

      expect(deps.backupTo).toHaveBeenCalledWith("C:/backups/mine.db");
      expect(deps.onSuccess).toHaveBeenCalledWith("C:/backups/mine.db");
      expect(deps.onError).not.toHaveBeenCalled();
    });
  });

  describe("when the backup fails", () => {
    it("reports the failure message and no success", async () => {
      const deps = createDeps({
        backupTo: vi
          .fn()
          .mockRejectedValue(
            new Error("Backup request failed with status 500")
          ),
      });

      await createBackup(deps);

      expect(deps.onError).toHaveBeenCalledWith(
        "Backup request failed with status 500"
      );
      expect(deps.onSuccess).not.toHaveBeenCalled();
    });

    it("does not throw when the backup rejects", async () => {
      const deps = createDeps({
        backupTo: vi.fn().mockRejectedValue(new Error("disk full")),
      });

      await expect(createBackup(deps)).resolves.toBeUndefined();
    });
  });
});
