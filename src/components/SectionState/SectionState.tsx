import type { ReactNode } from "react";
import FadeSwap from "../FadeSwap/FadeSwap";
import { StyledSection, StyledErrorText } from "./SectionState.styles";

interface Props {
  /** Stable hook for the section's place in the layout, and for tests. */
  testId: string;
  isLoading: boolean;
  error?: string | null;
  /** Layout-matched placeholder shown while this section's own data loads. */
  skeleton: ReactNode;
  children: ReactNode;
}

/**
 * One section's loading / error / content switch. The wrapper renders in every
 * state, so a section holds its place from the first frame and nothing reflows
 * when its data lands. Each section is driven only by the resources it needs,
 * which is what lets a fast section reveal while a slow one is still pending.
 * Error wins over loading, so a failed section reads differently from a
 * pending one rather than sitting on a skeleton forever. The switch is the only
 * skeleton→content handover in the app, so the fade lives here: whichever of
 * the three states is on show fades in when it takes over.
 */
export default function SectionState({
  testId,
  isLoading,
  error,
  skeleton,
  children,
}: Props) {
  const state = error ? "error" : isLoading ? "loading" : "content";

  return (
    <StyledSection data-testid={testId}>
      <FadeSwap testId={`${testId}-fade`} swapKey={state}>
        {state === "error" ? (
          <StyledErrorText>{`Error: ${error}`}</StyledErrorText>
        ) : state === "loading" ? (
          skeleton
        ) : (
          children
        )}
      </FadeSwap>
    </StyledSection>
  );
}
