import { useState, useEffect } from "react";

/**
 * The full update lifecycle surfaced to the UI. `available`/`ready` come from
 * the automatic auto-update flow; `checking`/`uptodate`/`error`/`dev-unavailable`
 * come from a manual "Check for Updates" run relayed over `onManualResult`.
 */
type UpdateState =
  | "idle"
  | "available"
  | "ready"
  | "checking"
  | "uptodate"
  | "error"
  | "dev-unavailable";

interface UpdateStatus {
  state: UpdateState;
  /** Detail for the manual outcomes — the up-to-date line or the error text. */
  message?: string;
  install: () => void;
  download: () => void;
}

export function useUpdateStatus(): UpdateStatus {
  const [state, setState] = useState<UpdateState>("idle");
  const [message, setMessage] = useState<string | undefined>(undefined);

  useEffect(() => {
    const unsubscribeDownloaded = window.horizon?.updates.onUpdateDownloaded(
      () => {
        setState("ready");
        setMessage(undefined);
      }
    );
    const unsubscribeAvailable = window.horizon?.updates.onUpdateAvailable(
      () => {
        setState("available");
        setMessage(undefined);
      }
    );
    const unsubscribeManual = window.horizon?.updates.onManualResult(
      (result) => {
        setState(result.state);
        setMessage(result.message);
      }
    );
    return () => {
      unsubscribeDownloaded?.();
      unsubscribeAvailable?.();
      unsubscribeManual?.();
    };
  }, []);

  function install() {
    window.horizon?.updates.quitAndInstall();
  }

  function download() {
    window.horizon?.updates.downloadUpdate();
  }

  return { state, message, install, download };
}
