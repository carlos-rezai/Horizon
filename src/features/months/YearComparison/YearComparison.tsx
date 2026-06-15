import Card from "../../../components/Card/Card";
import SectionHead from "../../../components/SectionHead/SectionHead";
import Badge from "../../../primitives/Badge/Badge";
import { StyledIntro, StyledComingSoon } from "./YearComparison.styles";

interface Props {
  /** Full month label (e.g. "June") used in the descriptive copy. */
  monthLabel: string;
}

/**
 * Year-over-year comparison card — an honest "Planned" placeholder. Per
 * design-log decision #6 it ships with no fabricated bars: it frames the
 * feature truthfully and marks it as coming soon.
 */
export default function YearComparison({ monthLabel }: Props) {
  return (
    <Card>
      <SectionHead
        label="Year comparison"
        title="This year so far"
        right={<Badge tone="accent">Planned</Badge>}
      />
      <StyledIntro>
        Spending from Jan 1 through {monthLabel}, compared with the same period
        last year.
      </StyledIntro>
      <StyledComingSoon>
        Year-over-year comparison is coming soon.
      </StyledComingSoon>
    </Card>
  );
}
