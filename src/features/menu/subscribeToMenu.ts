/** The native-menu half of the Electron bridge, as the preload exposes it. */
type MenuBridge = NonNullable<Window["horizon"]>["menu"];

/**
 * Subscribes to one native-menu channel and hands back its unsubscribe, ready
 * to be returned straight from a `useEffect`.
 *
 * Every menu hook needs the same three lines around its one interesting one:
 * read the bridge off `window`, do nothing at all when it is absent (the
 * browser dev server has no Electron behind it), and unsubscribe on unmount.
 * That ceremony lives here so each hook is left with only the channel it cares
 * about and what it does with the message.
 *
 * `subscribe` is handed the bridge rather than a channel name, so each caller's
 * callback keeps the exact payload type its channel declares.
 */
export function subscribeToMenu(
  subscribe: (menu: MenuBridge) => () => void
): () => void {
  const menu = window.horizon?.menu;
  if (!menu) return () => {};

  return subscribe(menu);
}
