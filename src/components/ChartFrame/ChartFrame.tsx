import type { ReactNode } from "react";
import {
  StyledCard,
  StyledHeader,
  StyledOverline,
  StyledTitle,
  StyledLoadingState,
} from "./ChartFrame.styles";

interface Props {
  /** Small uppercase label above the title. */
  overline: string;
  /** The chart's heading. */
  title: string;
  /** Header right-slot: range chips, a series-toggle count, links, etc. The
   *  caller owns its visibility logic; pass a falsy value to show nothing. */
  controls?: ReactNode;
  /** When true, the body is replaced by a "Loading…" line. */
  isLoading: boolean;
  /** Stable hook for tests to target this chart's loading line. */
  loadingTestId?: string;
  /** Top margin in px; defaults to the standard card gap. */
  topSpacing?: number;
  /** The chart body, shown once loading resolves. The caller decides what the
   *  body is — a real chart, an empty state, etc. */
  children: ReactNode;
}

/**
 * The shared card shell for a Meridian chart: an elevated card with an
 * overline + title header, a right-hand controls slot, and a loading state.
 * Domain-agnostic — it knows nothing about series or accounts; it frames
 * whatever body the feature supplies.
 */
export default function ChartFrame({
  overline,
  title,
  controls,
  isLoading,
  loadingTestId,
  topSpacing,
  children,
}: Props) {
  return (
    <StyledCard $topSpacing={topSpacing}>
      <StyledHeader>
        <div>
          <StyledOverline>{overline}</StyledOverline>
          <StyledTitle>{title}</StyledTitle>
        </div>
        {controls}
      </StyledHeader>
      {isLoading ? (
        <StyledLoadingState data-testid={loadingTestId}>
          Loading…
        </StyledLoadingState>
      ) : (
        children
      )}
    </StyledCard>
  );
}
