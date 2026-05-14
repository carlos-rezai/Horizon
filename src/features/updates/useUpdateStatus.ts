import { useState, useEffect } from "react";

type UpdateState = "idle" | "ready";

interface UpdateStatus {
  state: UpdateState;
  install: () => void;
}

export function useUpdateStatus(): UpdateStatus {
  const [state, setState] = useState<UpdateState>("idle");

  useEffect(() => {
    const unsubscribe = window.horizon?.updates.onUpdateDownloaded(() => {
      setState("ready");
    });
    return () => {
      unsubscribe?.();
    };
  }, []);

  function install() {
    window.horizon?.updates.quitAndInstall();
  }

  return { state, install };
}
