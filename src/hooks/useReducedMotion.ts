import { useSyncExternalStore } from "react";

const REDUCE_QUERY = "(prefers-reduced-motion: reduce)";

function matchReduce(): MediaQueryList | null {
  const supported =
    typeof window !== "undefined" && typeof window.matchMedia === "function";
  return supported ? window.matchMedia(REDUCE_QUERY) : null;
}

function subscribe(onChange: () => void): () => void {
  const list = matchReduce();
  if (!list) return () => {};

  list.addEventListener("change", onChange);
  return () => list.removeEventListener("change", onChange);
}

function getSnapshot(): boolean {
  return matchReduce()?.matches ?? false;
}

/**
 * Whether the OS asks for reduced motion. Every piece of app motion reads the
 * preference through this one hook, so honouring it is proven here rather than
 * on animation frames. Environments without `matchMedia` (jsdom, older Electron)
 * report no preference, which leaves motion on rather than silently killing it.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false);
}
