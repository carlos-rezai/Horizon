import { createContext, useContext } from "react";

export type SnackbarVariant = "info" | "success" | "warning" | "error";

export interface SnackbarActionConfig {
  label: string;
  onClick: () => void;
}

export interface NotifyOptions {
  variant?: SnackbarVariant;
  action?: SnackbarActionConfig;
  duration?: number;
}

export type NotifyArg = SnackbarVariant | NotifyOptions;

export interface SnackbarContextValue {
  notify: (message: string, opts?: NotifyArg) => number;
  dismiss: (id: number) => void;
}

export const SnackbarContext = createContext<SnackbarContextValue | null>(null);

export function useSnackbar(): SnackbarContextValue {
  const ctx = useContext(SnackbarContext);
  if (!ctx) {
    throw new Error("useSnackbar must be used within a SnackbarProvider");
  }
  return ctx;
}

/**
 * The provider's single fixed stacking region — the shared DOM node into which
 * persistent banners portal so they stack with transient snacks instead of
 * overlapping. `null` outside a provider (e.g. isolated component tests).
 */
export const SnackbarStackContext = createContext<HTMLElement | null>(null);

/** Non-throwing: returns the shared stack node, or null outside a provider. */
export function useSnackbarStack(): HTMLElement | null {
  return useContext(SnackbarStackContext);
}
