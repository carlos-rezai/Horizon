/**
 * Dependency-injected orchestrator for the Help → "Check for Updates…" manual
 * trigger. The `autoUpdater` check and the outcome sinks are injected so the
 * routing is unit-testable without launching Electron. The main process wires
 * the sinks to the renderer's manual-result channel (checking / up-to-date /
 * error / dev-unavailable), so every outcome surfaces in-app. Available and
 * downloading updates are left to the existing update IPC → in-app banner flow.
 */
export interface ManualUpdateCheckDeps {
  isPackaged: boolean;
  checkForUpdates: () => Promise<{ isUpdateAvailable: boolean } | null>;
  onChecking: () => void;
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

  deps.onChecking();

  try {
    const result = await deps.checkForUpdates();
    if (result?.isUpdateAvailable) {
      // The in-app banner/snackbar already surfaces this via the update IPC —
      // no duplicate messaging.
      return;
    }
    deps.onUpToDate();
  } catch (err) {
    deps.onError(err instanceof Error ? err.message : String(err));
  }
}
