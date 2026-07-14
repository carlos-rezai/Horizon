/**
 * Dependency-injected orchestrator for the File → "Restore from Backup…" menu
 * action. The native open-picker, the destructive-overwrite confirmation, the
 * restore HTTP call, the window reload, and the error sink are injected so the
 * flow is unit-testable without launching Electron. The window is reloaded only
 * on success; a cancelled picker or a declined confirm is a silent no-op, and a
 * failure surfaces an error without reloading.
 */
export interface RestoreFromBackupDeps {
  /** Native open-picker. Resolves the chosen path, or null when cancelled. */
  pickOpenPath: () => Promise<string | null>;
  /** Destructive-overwrite confirm; resolves true to proceed, false to abort. */
  confirm: (path: string) => Promise<boolean>;
  /** Restores from `path`; rejects if the request fails. */
  restoreFrom: (path: string) => Promise<void>;
  reloadWindow: () => void;
  onError: (message: string) => void;
}

export async function restoreFromBackup(
  deps: RestoreFromBackupDeps
): Promise<void> {
  const path = await deps.pickOpenPath();
  if (!path) {
    // Cancelled picker.
    return;
  }

  const confirmed = await deps.confirm(path);
  if (!confirmed) {
    // Declined the overwrite — never touch the data.
    return;
  }

  try {
    await deps.restoreFrom(path);
    deps.reloadWindow();
  } catch (err) {
    deps.onError(err instanceof Error ? err.message : String(err));
  }
}
