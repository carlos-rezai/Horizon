import type { ReactNode } from "react";
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

  return (
    <StyledFade
      key={swapKey}
      $reduced={reduced}
      data-testid={testId}
      data-motion={reduced ? "none" : "fade"}
    >
      {children}
    </StyledFade>
  );
}
