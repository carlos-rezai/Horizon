import { useCallback, useState, type ReactNode } from "react";
import AlertModal from "../AlertModal/AlertModal";
import { AlertContext, type AlertOptions } from "./useAlert";

interface AlertProviderProps {
  children: ReactNode;
}

/**
 * Imperative single-host provider for acknowledge modals, mirroring
 * `SnackbarProvider`: `useAlert().alert(opts)` shows one `AlertModal` at a
 * time. Showing a new alert replaces the current one, so there is exactly one
 * alert host at the layout root — the menu dialog host and the update banner
 * share it rather than each mounting their own modal.
 */
export default function AlertProvider({ children }: AlertProviderProps) {
  const [current, setCurrent] = useState<AlertOptions | null>(null);

  const alert = useCallback((opts: AlertOptions) => {
    setCurrent(opts);
  }, []);

  const dismiss = useCallback(() => setCurrent(null), []);

  return (
    <AlertContext.Provider value={{ alert }}>
      {children}
      {current && (
        <AlertModal
          title={current.title}
          message={current.message}
          detail={current.detail}
          tone={current.tone}
          okLabel={current.okLabel}
          onClose={dismiss}
        />
      )}
    </AlertContext.Provider>
  );
}
