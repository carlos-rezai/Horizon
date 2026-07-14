/**
 * Dependency-injected orchestrator for the Help → "Check for Updates…" manual
 * trigger. The native dialogs and the `autoUpdater` check are injected so the
 * outcome routing is unit-testable without launching Electron. The main process
 * supplies concrete implementations; available/downloading updates are left to
 * the existing update IPC → in-app banner flow (no native box).
 */
export interface ManualUpdateCheckDeps {
  isPackaged: boolean;
  checkForUpdates: () => Promise<{ isUpdateAvailable: boolean } | null>;
  onUpToDate: () => void;
  onError: (message: string) => void;
  onDevUnavailable: () => void;
}

export async function runManualUpdateCheck(
  deps: ManualUpdateCheckDeps
): Promise<void> {
  if (!deps.isPackaged) {
    deps.onDevUnavailable();
    return;
  }

  try {
    const result = await deps.checkForUpdates();
    if (result?.isUpdateAvailable) {
      // The in-app banner/snackbar already surfaces this via the update IPC —
      // no native box, no duplicate UI.
      return;
    }
    deps.onUpToDate();
  } catch (err) {
    deps.onError(err instanceof Error ? err.message : String(err));
  }
}
