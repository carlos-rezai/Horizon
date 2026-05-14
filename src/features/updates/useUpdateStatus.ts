import { useState, useEffect } from "react";

type UpdateState = "idle" | "available" | "ready";

interface UpdateStatus {
  state: UpdateState;
  install: () => void;
  download: () => void;
}

export function useUpdateStatus(): UpdateStatus {
  const [state, setState] = useState<UpdateState>("idle");

  useEffect(() => {
    const unsubscribeDownloaded = window.horizon?.updates.onUpdateDownloaded(
      () => {
        setState("ready");
      }
    );
    const unsubscribeAvailable = window.horizon?.updates.onUpdateAvailable(
      () => {
        setState("available");
      }
    );
    return () => {
      unsubscribeDownloaded?.();
      unsubscribeAvailable?.();
    };
  }, []);

  function install() {
    window.horizon?.updates.quitAndInstall();
  }

  function download() {
    window.horizon?.updates.downloadUpdate();
  }

  return { state, install, download };
}
