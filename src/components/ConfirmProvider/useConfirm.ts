import { createContext, useContext } from "react";
import type { ConfirmTone } from "../ConfirmModal/ConfirmModal";

export interface ConfirmOptions {
  title: string;
  message: string;
  detail?: string;
  tone?: ConfirmTone;
  confirmLabel?: string;
  cancelLabel?: string;
}

export type ConfirmFn = (opts: ConfirmOptions) => Promise<boolean>;

export interface ConfirmContextValue {
  confirm: ConfirmFn;
}

export const ConfirmContext = createContext<ConfirmContextValue | null>(null);

/**
 * Returns an imperative `confirm(opts)` that resolves `true` when the user
 * confirms and `false` when they cancel or dismiss the modal.
 */
export function useConfirm(): ConfirmFn {
  const ctx = useContext(ConfirmContext);
  if (!ctx) {
    throw new Error("useConfirm must be used within a ConfirmProvider");
  }
  return ctx.confirm;
}
