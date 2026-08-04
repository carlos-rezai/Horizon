import { useEffect } from "react";
import { subscribeToMenu } from "./subscribeToMenu";

/**
 * Subscribes to the native Help menu's manual request (`menu:open-manual`,
 * surfaced on `window.horizon.menu.onOpenManual`) and opens the manual drawer
 * over whatever screen is showing. The drawer owns no route, so this is a
 * channel of its own rather than a `menu:navigate` message carrying an invented
 * route. A no-op when the Electron bridge is absent (e.g. the browser dev
 * server).
 */
export function useMenuOpenManual(open: () => void): void {
  useEffect(
    () =>
      subscribeToMenu((menu) =>
        menu.onOpenManual(() => {
          open();
        })
      ),
    [open]
  );
}
