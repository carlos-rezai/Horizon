import { useEffect } from "react";
import { useSnackbar } from "../../components/SnackbarProvider/useSnackbar";
import { useAlert } from "../../components/AlertProvider/useAlert";
import { useConfirm } from "../../components/ConfirmProvider/useConfirm";

/**
 * Renderer host for menu-action dialogs. It subscribes to the two in-app
 * channels the native application menu drives through the main process:
 *
 * - `menu:notify` — a result message. `success`/`info` become a transient
 *   snackbar; `error` raises the acknowledge modal (errors carry a message
 *   worth reading and deserve a blocking dismiss).
 * - `menu:confirm` — a yes/no question. It opens the confirm modal and replies
 *   with `respondConfirm(id, confirmed)`, correlating the answer by request id.
 *
 * A safe no-op when the Electron bridge is absent (e.g. the browser dev
 * server). Must be mounted inside the Snackbar/Alert/Confirm providers.
 */
export function useMenuDialogs(): void {
  const { notify } = useSnackbar();
  const { alert } = useAlert();
  const confirm = useConfirm();

  useEffect(() => {
    const unsubscribeNotify = window.horizon?.menu.onNotify((notification) => {
      if (notification.tone === "error") {
        alert({
          title: notification.title,
          message: notification.message,
          detail: notification.detail,
          tone: "error",
        });
        return;
      }
      notify(notification.message, notification.tone);
    });

    const unsubscribeConfirm = window.horizon?.menu.onConfirm((request) => {
      void confirm({
        title: request.title,
        message: request.message,
        detail: request.detail,
        tone: request.tone,
        confirmLabel: request.confirmLabel,
        cancelLabel: request.cancelLabel,
      }).then((confirmed) => {
        window.horizon?.menu.respondConfirm(request.id, confirmed);
      });
    });

    return () => {
      unsubscribeNotify?.();
      unsubscribeConfirm?.();
    };
  }, [notify, alert, confirm]);
}
