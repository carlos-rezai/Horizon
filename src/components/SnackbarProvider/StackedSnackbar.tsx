import { createPortal } from "react-dom";
import type { ComponentProps } from "react";
import Snackbar from "../Snackbar/Snackbar";
import { useSnackbarStack } from "./useSnackbar";

type Props = Omit<ComponentProps<typeof Snackbar>, "positioned">;

/**
 * A Snackbar that joins the SnackbarProvider's single fixed stacking region, so
 * persistent banners (updates, insufficient-funds warnings, settlement errors)
 * stack with transient snacks instead of overlapping in the same corner. When
 * rendered outside a provider (e.g. isolated component tests) it falls back to
 * its own fixed positioning, preserving standalone behaviour.
 */
export default function StackedSnackbar(props: Props) {
  const stack = useSnackbarStack();
  if (stack) {
    return createPortal(<Snackbar {...props} positioned={false} />, stack);
  }
  return <Snackbar {...props} positioned />;
}
