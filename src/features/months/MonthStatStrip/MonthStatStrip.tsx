import StatBlock from "../../../components/StatBlock/StatBlock";
import Money from "../../../primitives/Money/Money";
import type { MonthStats } from "../../../utils/monthStats/monthStats";
import {
  StyledStrip,
  StyledCell,
  StyledValue,
  StyledCount,
} from "./MonthStatStrip.styles";

interface Props {
  stats: MonthStats;
}

/**
 * The Month Overview headline strip: four cells (Variable Spending, Of which
 * Cat, Entries, Avg / day) sharing one bordered container.
 */
export default function MonthStatStrip({ stats }: Props) {
  return (
    <StyledStrip data-testid="month-stat-strip">
      <StyledCell>
        <StatBlock label="Variable Spending">
          <StyledValue $tone="neg">
            <Money cents={stats.variableSpending} />
          </StyledValue>
        </StatBlock>
      </StyledCell>
      <StyledCell>
        <StatBlock label="Of which Cat">
          <StyledValue $tone="neutral">
            <Money cents={stats.ofWhichCat} />
          </StyledValue>
        </StatBlock>
      </StyledCell>
      <StyledCell>
        <StatBlock label="Entries">
          <StyledCount>{stats.entries}</StyledCount>
        </StatBlock>
      </StyledCell>
      <StyledCell $last>
        <StatBlock label="Avg / day">
          <StyledValue $tone="muted">
            <Money cents={stats.avgPerDay} />
          </StyledValue>
        </StatBlock>
      </StyledCell>
    </StyledStrip>
  );
}
