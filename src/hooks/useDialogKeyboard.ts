import { useEffect, useId, useRef, type RefObject } from "react";

/** Everything a dialog surface can put a keyboard on. A surface carrying
 *  `tabindex="-1"` is excluded by the last clause, so it never joins the ring
 *  it bounds. */
const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/** Every surface currently holding the keyboard, in the order it was taken —
 *  topmost last. Two dialogs can share the screen (a menu-driven confirm over
 *  an open form, say), and two live traps is a keyboard deadlock rather than a
 *  cosmetic bug, so only the last entry here acts on a key. */
const openSurfaces: string[] = [];

export interface DialogKeyboardOptions {
  /** The surface the keyboard is confined to. It must be focusable itself —
   *  `tabindex="-1"` is enough — because focus lands on the surface rather than
   *  on whichever control happens to come first inside it. */
  surfaceRef: RefObject<HTMLElement | null>;
  /** Invoked on Escape. The surface stays mounted; unmounting is the caller's. */
  onClose: () => void;
  /** Whether the surface currently holds the keyboard. Defaults to true, which
   *  is right for a dialog that is only in the tree while it is open; a surface
   *  that lingers to animate out passes its own flag so the keyboard is handed
   *  back when it starts closing rather than when it finally leaves. */
  open?: boolean;
  /** Where focus goes on close when nothing in the page opened the surface —
   *  the Electron menu leaves the keyboard outside the window entirely, so
   *  there is no trigger to hand it back to. */
  returnFocusRef?: RefObject<HTMLElement | null>;
}

/**
 * The three keyboard obligations `aria-modal="true"` takes on, in one place:
 * focus moves onto the surface when it opens, Tab and Shift+Tab cycle within it
 * rather than walking onto the screen behind, Escape closes, and the position
 * the keyboard came from is handed back on close.
 *
 * It lives in `src/hooks/` rather than inside a dialog component because both
 * of the app's modal surfaces need it and neither can render through the other:
 * the shared `Modal` is a centred dialog, and the manual is a right-side
 * slide-over with its own navigation rail and scrolling pane.
 */
export function useDialogKeyboard({
  surfaceRef,
  onClose,
  open = true,
  returnFocusRef,
}: DialogKeyboardOptions): void {
  const restoreRef = useRef<HTMLElement | null>(null);
  const id = useId();

  // Claims the top of the stack while open, and yields it back on close. Kept
  // apart from the listener below so that a caller passing a fresh `onClose`
  // each render re-binds its listener without reordering the stack.
  useEffect(() => {
    if (!open) return;

    openSurfaces.push(id);
    return () => {
      const at = openSurfaces.lastIndexOf(id);
      if (at !== -1) openSurfaces.splice(at, 1);
    };
  }, [open, id]);

  // Takes the keyboard on open and gives it back the moment `open` flips, not
  // when the surface finally leaves the tree — nobody should have to wait out
  // an exit transition to carry on where they were.
  useEffect(() => {
    if (!open) return;

    const previous = document.activeElement;
    restoreRef.current =
      previous instanceof HTMLElement && previous !== document.body
        ? previous
        : null;
    surfaceRef.current?.focus();

    return () => {
      const restore = restoreRef.current;
      // Reading the fallback here, in the cleanup, is the point: it has to be
      // whatever is on screen when the surface closes, not what was there when
      // it opened.
      // eslint-disable-next-line react-hooks/exhaustive-deps
      const fallback = returnFocusRef?.current ?? null;
      const target = restore?.isConnected ? restore : fallback;
      target?.focus();
    };
  }, [open, surfaceRef, returnFocusRef]);

  useEffect(() => {
    if (!open) return;

    function onKeyDown(event: KeyboardEvent) {
      // Checked per key rather than at bind time: a surface that was topmost
      // when it opened stops being so the moment another opens over it.
      if (openSurfaces[openSurfaces.length - 1] !== id) return;

      if (event.key === "Escape") {
        onClose();
        return;
      }

      // The browser already knows how to walk a tab ring; this only closes it,
      // at the two edges where the next stop would be the screen behind.
      if (event.key !== "Tab") return;

      const surface = surfaceRef.current;
      if (!surface) return;

      const focusable = Array.from(
        surface.querySelectorAll<HTMLElement>(FOCUSABLE)
      );
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (event.shiftKey && (active === first || active === surface)) {
        event.preventDefault();
        last.focus();
        return;
      }

      if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, onClose, surfaceRef, id]);
}
