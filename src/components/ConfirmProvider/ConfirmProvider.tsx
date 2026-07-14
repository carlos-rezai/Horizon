import { useCallback, useRef, useState, type ReactNode } from "react";
import ConfirmModal from "../ConfirmModal/ConfirmModal";
import { ConfirmContext, type ConfirmOptions } from "./useConfirm";

interface ConfirmProviderProps {
  children: ReactNode;
}

/**
 * Imperative single-host provider for confirm/cancel modals, mirroring
 * `AlertProvider`. `useConfirm()` returns a `confirm(opts) => Promise<boolean>`
 * that resolves `true` on confirm and `false` on cancel or dismiss. One modal
 * is shown at a time; a second `confirm` call resolves any pending one as
 * cancelled before replacing it, so a promise is never left dangling.
 */
export default function ConfirmProvider({ children }: ConfirmProviderProps) {
  const [current, setCurrent] = useState<ConfirmOptions | null>(null);
  const resolverRef = useRef<((value: boolean) => void) | null>(null);

  const settle = useCallback((value: boolean) => {
    resolverRef.current?.(value);
    resolverRef.current = null;
    setCurrent(null);
  }, []);

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    // Defensively resolve any already-open confirm as cancelled before opening
    // a new one, so its awaiter is never left hanging.
    resolverRef.current?.(false);
    return new Promise<boolean>((resolve) => {
      resolverRef.current = resolve;
      setCurrent(opts);
    });
  }, []);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {current && (
        <ConfirmModal
          title={current.title}
          message={current.message}
          detail={current.detail}
          tone={current.tone}
          confirmLabel={current.confirmLabel}
          cancelLabel={current.cancelLabel}
          onConfirm={() => settle(true)}
          onCancel={() => settle(false)}
        />
      )}
    </ConfirmContext.Provider>
  );
}
