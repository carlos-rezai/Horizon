import Skeleton from "../../../primitives/Skeleton/Skeleton";
import { StyledSectionHead } from "../../../components/SectionHead/SectionHead.styles";
import { StyledSection } from "./PlanSummary.styles";
import { StyledTitleStack, StyledRows } from "./PlanSummarySkeleton.styles";

// The dashboard summary is capped at ten years; the placeholder shows the same
// run of rows.
const ROWS = Array.from({ length: 10 }, (_, row) => row);

const ROW_HEIGHT = 26;

/**
 * Placeholder for the Plan Summary — its section header, then one block per
 * year row, so the card is the same height before and after the projection
 * resolves.
 */
export default function PlanSummarySkeleton() {
  return (
    <StyledSection data-testid="plan-summary-skeleton">
      <StyledSectionHead>
        <StyledTitleStack>
          <Skeleton width={54} height={10} />
          <Skeleton width={124} height={18} />
        </StyledTitleStack>
        <Skeleton width={92} height={26} />
      </StyledSectionHead>
      <StyledRows>
        {ROWS.map((row) => (
          <Skeleton key={row} height={ROW_HEIGHT} />
        ))}
      </StyledRows>
    </StyledSection>
  );
}
