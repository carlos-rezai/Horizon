/**
 * Dependency-injected orchestrator for the File → "Start Fresh…" menu action.
 * The destructive confirmation, the reset HTTP call, the window reload, and the
 * error sink are injected so the flow is unit-testable without launching
 * Electron. The window is reloaded only on success; a declined confirm is a
 * silent no-op, and a failure surfaces an error without reloading.
 */
export interface StartFreshDeps {
  /** Destructive confirm; resolves true to proceed, false to abort. */
  confirm: () => Promise<boolean>;
  /** Resets all data; rejects if the request fails. */
  reset: () => Promise<void>;
  reloadWindow: () => void;
  onError: (message: string) => void;
}

export async function startFresh(deps: StartFreshDeps): Promise<void> {
  const confirmed = await deps.confirm();
  if (!confirmed) {
    // Declined the erase — never touch the data.
    return;
  }

  try {
    await deps.reset();
    deps.reloadWindow();
  } catch (err) {
    deps.onError(err instanceof Error ? err.message : String(err));
  }
}
