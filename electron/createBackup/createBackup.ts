/**
 * Dependency-injected orchestrator for the File → "Create Backup…" menu action.
 * The native save-picker, the backup HTTP call, and the two result sinks are
 * injected so the outcome routing is unit-testable without launching Electron.
 * The main process supplies concrete implementations (a `showSaveDialog`, a
 * fetch to `/storage/backup-to`, and renderer notifications).
 */
export interface CreateBackupDeps {
  /** Native save-picker. Resolves the chosen path, or null when cancelled. */
  pickSavePath: () => Promise<string | null>;
  /** Writes the backup to `path`; rejects if the request fails. */
  backupTo: (path: string) => Promise<void>;
  onSuccess: (path: string) => void;
  onError: (message: string) => void;
}

export async function createBackup(deps: CreateBackupDeps): Promise<void> {
  const path = await deps.pickSavePath();
  if (!path) {
    // Cancelled picker — nothing to do, nothing to report.
    return;
  }

  try {
    await deps.backupTo(path);
    deps.onSuccess(path);
  } catch (err) {
    deps.onError(err instanceof Error ? err.message : String(err));
  }
}
