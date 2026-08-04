import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { subscribeToMenu } from "./subscribeToMenu";

/**
 * Subscribes to native-menu navigation requests (`menu:navigate`, surfaced on
 * `window.horizon.menu.onNavigate`) and performs a client-side route change to
 * the requested target. This keeps opening Settings from the menu bar a
 * router transition into the existing in-app surface rather than a window
 * reload. A no-op when the Electron bridge is absent (e.g. the browser dev
 * server).
 */
export function useMenuNavigation(): void {
  const navigate = useNavigate();

  useEffect(
    () =>
      subscribeToMenu((menu) =>
        menu.onNavigate((route) => {
          navigate(route);
        })
      ),
    [navigate]
  );
}
