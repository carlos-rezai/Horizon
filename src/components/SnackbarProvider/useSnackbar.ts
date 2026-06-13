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
