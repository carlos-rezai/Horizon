import { useState, type ReactNode } from "react";
import { useReducedMotion } from "../../hooks/useReducedMotion";
import { StyledFade } from "./FadeSwap.styles";

interface Props {
  /** Stable hook for the wrapper, and for tests. */
  testId: string;
  /** Identity of the data on show — a month, an account tab, a load state. */
  swapKey: string;
  children: ReactNode;
}

/**
 * Cross-fades whatever it wraps when the data underneath is swapped out. The
 * wrapper is keyed by `swapKey`, so a re-render with the same key updates in
 * place — only a genuine swap remounts the element and replays the fade. Under
 * `prefers-reduced-motion` the fade is dropped and the content still swaps: the
 * preference removes the motion, never the data.
 */
export default function FadeSwap({ testId, swapKey, children }: Props) {
  const reduced = useReducedMotion();

  // The first paint has nothing to cross-fade from, so it is shown outright.
  // Fading it in from zero opacity would hold the largest contentful paint
  // back until the whole progressive reveal had finished — 615ms against
  // 176ms without it, measured on the Dashboard cold load (issue #206).
  // Latched rather than compared against the current key, so a swap back to an
  // earlier key still fades.
  const [shownKey, setShownKey] = useState(swapKey);
  const [swapped, setSwapped] = useState(false);
  if (shownKey !== swapKey) {
    setShownKey(swapKey);
    setSwapped(true);
  }
  const animate = !reduced && swapped;

  return (
    <StyledFade
      key={swapKey}
      $animate={animate}
      data-testid={testId}
      data-motion={reduced ? "none" : "fade"}
    >
      {children}
    </StyledFade>
  );
}
