import { useCallback } from "react";
import { useSnackbar, type SnackbarVariant } from "./useSnackbar";

interface UndoableDeleteConfig<T> {
  remove: (item: T) => Promise<void>;
  recreate: (item: T) => Promise<void>;
  message: (item: T) => string;
  variant?: SnackbarVariant;
  undoLabel?: string;
}

/**
 * Capture-and-recreate Undo for cheap deletes. Deletes the item, then surfaces
 * a snackbar whose Undo action re-creates the captured payload (a re-POST).
 */
export function useUndoableDelete<T>({
  remove,
  recreate,
  message,
  variant = "success",
  undoLabel = "Undo",
}: UndoableDeleteConfig<T>): (item: T) => Promise<void> {
  const { notify } = useSnackbar();

  return useCallback(
    async (item: T) => {
      await remove(item);
      notify(message(item), {
        variant,
        action: {
          label: undoLabel,
          onClick: () => {
            void recreate(item);
          },
        },
      });
    },
    [remove, recreate, message, variant, undoLabel, notify]
  );
}
