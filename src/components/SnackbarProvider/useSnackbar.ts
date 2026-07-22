import { createContext, useCallback, useContext } from "react";

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
 * Non-throwing `notify`: sends the message when a provider is in the tree and
 * does nothing when it is not. For code that lives below the provider in the
 * running app but is also exercised on its own, where a snackbar is chrome the
 * caller does not care about rather than a dependency worth failing over.
 */
export function useOptionalNotify(): (
  message: string,
  opts?: NotifyArg
) => void {
  const ctx = useContext(SnackbarContext);

  return useCallback(
    (message: string, opts?: NotifyArg) => {
      ctx?.notify(message, opts);
    },
    [ctx]
  );
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
