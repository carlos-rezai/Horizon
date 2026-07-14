import { createContext, useContext } from "react";
import type { AlertTone } from "../AlertModal/AlertModal";

export interface AlertOptions {
  title: string;
  message: string;
  detail?: string;
  tone?: AlertTone;
  okLabel?: string;
}

export interface AlertContextValue {
  /** Shows a single acknowledge modal, replacing any currently-visible one. */
  alert: (opts: AlertOptions) => void;
}

export const AlertContext = createContext<AlertContextValue | null>(null);

export function useAlert(): AlertContextValue {
  const ctx = useContext(AlertContext);
  if (!ctx) {
    throw new Error("useAlert must be used within an AlertProvider");
  }
  return ctx;
}
