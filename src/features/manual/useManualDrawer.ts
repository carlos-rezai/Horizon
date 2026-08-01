import { useCallback, useEffect, useRef, useState } from "react";
import { useReducedMotion } from "../../hooks/useReducedMotion";

/** How long the panel takes to slide in and back out. Owned here because this
 *  hook owns the delayed unmount that waits for it; the styles read it back. */
export const MANUAL_TRANSITION_MS = 320;

export interface ManualDrawerState {
  /** Whether the reader has the manual open — drives the enter/exit transition. */
  isOpen: boolean;
  /** Whether the drawer belongs in the tree at all — lags `isOpen` on close. */
  isMounted: boolean;
  open: () => void;
  close: () => void;
}

/**
 * The manual drawer's whole open/close story. Two states rather than one,
 * because the panel has to stay in the tree long enough to animate out: `close`
 * flips `isOpen` at once and unmounts only when the exit transition has run.
 *
 * Under `prefers-reduced-motion` there is no exit transition to wait for, so
 * the delay collapses and the drawer leaves immediately — otherwise a
 * reduced-motion reader would be left with an invisible overlay sitting over
 * the screen for a third of a second.
 */
export function useManualDrawer(): ManualDrawerState {
  const reduced = useReducedMotion();
  const [isOpen, setIsOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);
  const unmountTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelPendingUnmount = useCallback(() => {
    if (unmountTimer.current !== null) {
      clearTimeout(unmountTimer.current);
      unmountTimer.current = null;
    }
  }, []);

  const open = useCallback(() => {
    // Reopening mid-exit must not let the earlier close's timer pull the drawer
    // the reader just asked for back out of the tree.
    cancelPendingUnmount();
    setIsOpen(true);
    setIsMounted(true);
  }, [cancelPendingUnmount]);

  const close = useCallback(() => {
    cancelPendingUnmount();
    setIsOpen(false);

    if (reduced) {
      setIsMounted(false);
      return;
    }

    unmountTimer.current = setTimeout(() => {
      unmountTimer.current = null;
      setIsMounted(false);
    }, MANUAL_TRANSITION_MS);
  }, [reduced, cancelPendingUnmount]);

  useEffect(() => cancelPendingUnmount, [cancelPendingUnmount]);

  useEffect(() => {
    if (!isOpen) return;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") close();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, close]);

  return { isOpen, isMounted, open, close };
}
