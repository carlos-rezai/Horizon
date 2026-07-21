import type { ReactNode } from "react";
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
 * pending one rather than sitting on a skeleton forever.
 */
export default function SectionState({
  testId,
  isLoading,
  error,
  skeleton,
  children,
}: Props) {
  return (
    <StyledSection data-testid={testId}>
      {error ? (
        <StyledErrorText>{`Error: ${error}`}</StyledErrorText>
      ) : isLoading ? (
        skeleton
      ) : (
        children
      )}
    </StyledSection>
  );
}
